import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { agents, agentVersions } from "@contenthq/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { executeAgent } from "@contenthq/ai";
import {
  createAgentSchema,
  updateAgentSchema,
  executeAgentSchema,
  agentVersionHistorySchema,
  revertAgentSchema,
} from "@contenthq/shared";

export const agentRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          agentType: z.string().optional(),
          status: z.enum(["active", "inactive", "draft"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [];

      if (input?.agentType) {
        conditions.push(eq(agents.agentType, input.agentType));
      }
      if (input?.status) {
        conditions.push(eq(agents.status, input.status));
      }

      if (conditions.length > 0) {
        return db
          .select()
          .from(agents)
          .where(and(...conditions))
          .orderBy(desc(agents.updatedAt));
      }

      return db.select().from(agents).orderBy(desc(agents.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id));

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      return agent;
    }),

  create: protectedProcedure
    .input(createAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const [agent] = await db
        .insert(agents)
        .values({
          ...input,
          personaSelections: input.personaSelections ?? {},
          expectedVariables: input.expectedVariables ?? [],
          createdBy: ctx.user.id,
        })
        .returning();

      // Create initial version snapshot
      await db.insert(agentVersions).values({
        agentId: agent.id,
        version: 1,
        snapshot: agent,
        editedBy: ctx.user.id,
        changeNote: "Initial creation",
      });

      return agent;
    }),

  update: protectedProcedure
    .input(updateAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, changeNote, ...data } = input;

      return db.transaction(async (tx) => {
        const [existing] = await tx
          .select()
          .from(agents)
          .where(eq(agents.id, id));

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        // Snapshot current state before updating
        await tx.insert(agentVersions).values({
          agentId: existing.id,
          version: existing.version,
          snapshot: existing,
          editedBy: ctx.user.id,
          changeNote: changeNote ?? null,
        });

        const [updated] = await tx
          .update(agents)
          .set({
            ...data,
            version: existing.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, id))
          .returning();

        return updated;
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.id));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      // Soft delete: set status to inactive
      await db
        .update(agents)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(eq(agents.id, input.id));

      return { success: true };
    }),

  execute: protectedProcedure
    .input(executeAgentSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await executeAgent({
        agentId: input.agentId,
        variables: input.variables,
        projectId: input.projectId,
        userId: ctx.user.id,
        db,
      });

      return result;
    }),

  getVersionHistory: protectedProcedure
    .input(agentVersionHistorySchema)
    .query(async ({ input }) => {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.agentId));

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      const history = await db
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, input.agentId))
        .orderBy(desc(agentVersions.version))
        .limit(input.limit)
        .offset(input.offset);

      return { current: agent, history };
    }),

  revertToVersion: protectedProcedure
    .input(revertAgentSchema)
    .mutation(async ({ ctx, input }) => {
      return db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(agents)
          .where(eq(agents.id, input.agentId));

        if (!current) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        const [targetVersion] = await tx
          .select()
          .from(agentVersions)
          .where(
            and(
              eq(agentVersions.agentId, input.agentId),
              eq(agentVersions.version, input.targetVersion)
            )
          );

        if (!targetVersion) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.targetVersion} not found`,
          });
        }

        // Snapshot current state before reverting
        await tx.insert(agentVersions).values({
          agentId: current.id,
          version: current.version,
          snapshot: current,
          editedBy: ctx.user.id,
          changeNote: `Reverted to version ${input.targetVersion}`,
        });

        // Restore from snapshot
        const snapshot = targetVersion.snapshot as Record<string, unknown>;
        const [updated] = await tx
          .update(agents)
          .set({
            name: snapshot.name as string,
            slug: snapshot.slug as string,
            description: snapshot.description as string | null,
            agentType: snapshot.agentType as string,
            aiModelId: snapshot.aiModelId as string | null,
            modelConfig: snapshot.modelConfig as Record<string, unknown> | null,
            promptTemplateId: snapshot.promptTemplateId as string | null,
            systemPrompt: snapshot.systemPrompt as string | null,
            outputConfig: snapshot.outputConfig as { outputType: "text" | "object" | "array"; schemaName?: string; schemaJson?: Record<string, unknown> } | null,
            personaSelections: snapshot.personaSelections as Record<string, string>,
            expectedVariables: snapshot.expectedVariables as string[],
            status: snapshot.status as "active" | "inactive" | "draft",
            isDefault: snapshot.isDefault as boolean,
            version: current.version + 1,
            updatedAt: new Date(),
          })
          .where(eq(agents.id, input.agentId))
          .returning();

        return updated;
      });
    }),
});
