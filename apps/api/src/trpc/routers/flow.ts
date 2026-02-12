import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { flows, projectFlowConfigs, projects } from "@contenthq/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  createFlowSchema,
  updateFlowSchema,
  projectFlowConfigSchema,
} from "@contenthq/shared";

export const flowRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["active", "inactive", "draft"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      if (input?.status) {
        return db
          .select()
          .from(flows)
          .where(eq(flows.status, input.status))
          .orderBy(desc(flows.updatedAt));
      }
      return db.select().from(flows).orderBy(desc(flows.updatedAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const [flow] = await db
        .select()
        .from(flows)
        .where(eq(flows.id, input.id));

      if (!flow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flow not found",
        });
      }

      return flow;
    }),

  create: protectedProcedure
    .input(createFlowSchema)
    .mutation(async ({ ctx, input }) => {
      const [flow] = await db
        .insert(flows)
        .values({
          ...input,
          createdBy: ctx.user.id,
        })
        .returning();

      return flow;
    }),

  update: protectedProcedure
    .input(updateFlowSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [existing] = await db
        .select()
        .from(flows)
        .where(and(eq(flows.id, id), eq(flows.createdBy, ctx.user.id)));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flow not found",
        });
      }

      const [updated] = await db
        .update(flows)
        .set({
          ...data,
          version: (existing.version ?? 1) + 1,
          updatedAt: new Date(),
        })
        .where(eq(flows.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(flows)
        .where(and(eq(flows.id, input.id), eq(flows.createdBy, ctx.user.id)));

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flow not found",
        });
      }

      // Soft delete
      await db
        .update(flows)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(eq(flows.id, input.id));

      return { success: true };
    }),

  // Project flow config management
  getProjectFlowConfig: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const [config] = await db
        .select()
        .from(projectFlowConfigs)
        .where(eq(projectFlowConfigs.projectId, input.projectId));

      return config ?? null;
    }),

  setProjectFlowConfig: protectedProcedure
    .input(projectFlowConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const [result] = await db
        .insert(projectFlowConfigs)
        .values({
          projectId: input.projectId,
          flowId: input.flowId,
          nodeOverrides: input.nodeOverrides ?? null,
        })
        .onConflictDoUpdate({
          target: projectFlowConfigs.projectId,
          set: {
            flowId: input.flowId,
            nodeOverrides: input.nodeOverrides ?? null,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result;
    }),

  removeProjectFlowConfig: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      await db
        .delete(projectFlowConfigs)
        .where(eq(projectFlowConfigs.projectId, input.projectId));

      return { success: true };
    }),
});
