import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { flowExecutions } from "@contenthq/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { startFlowExecutionSchema } from "@contenthq/shared";
import { FlowEngine } from "../../services/flow-engine";

const flowEngine = new FlowEngine();

export const flowExecutionRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        flowId: z.string().optional(),
        projectId: z.string().uuid().optional(),
        status: z
          .enum(["pending", "running", "completed", "failed", "cancelled"])
          .optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const conditions: any[] = [eq(flowExecutions.userId, ctx.user.id)];

      if (input.flowId) {
        conditions.push(eq(flowExecutions.flowId, input.flowId));
      }
      if (input.projectId) {
        conditions.push(eq(flowExecutions.projectId, input.projectId));
      }
      if (input.status) {
        conditions.push(eq(flowExecutions.status, input.status));
      }

      const query = db
        .select()
        .from(flowExecutions)
        .orderBy(desc(flowExecutions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }

      return query;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [execution] = await db
        .select()
        .from(flowExecutions)
        .where(
          and(eq(flowExecutions.id, input.id), eq(flowExecutions.userId, ctx.user.id))
        );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flow execution not found",
        });
      }

      return execution;
    }),

  start: protectedProcedure
    .input(startFlowExecutionSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await flowEngine.executeFlow(
        input.flowId,
        input.projectId,
        ctx.user.id,
        input.inputData ?? {}
      );

      return result;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [execution] = await db
        .select()
        .from(flowExecutions)
        .where(
          and(eq(flowExecutions.id, input.id), eq(flowExecutions.userId, ctx.user.id))
        );

      if (!execution) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Flow execution not found",
        });
      }

      if (execution.status !== "running" && execution.status !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel execution with status: ${execution.status}`,
        });
      }

      await db
        .update(flowExecutions)
        .set({
          status: "cancelled",
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(flowExecutions.id, input.id));

      return { success: true };
    }),
});
