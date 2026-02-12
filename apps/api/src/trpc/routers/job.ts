import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { generationJobs } from "@contenthq/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export const jobRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(generationJobs)
        .where(
          and(
            eq(generationJobs.projectId, input.projectId),
            eq(generationJobs.userId, ctx.user.id)
          )
        )
        .orderBy(desc(generationJobs.createdAt));
    }),

  getLogsByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(generationJobs)
        .where(
          and(
            eq(generationJobs.projectId, input.projectId),
            eq(generationJobs.userId, ctx.user.id)
          )
        )
        .orderBy(asc(generationJobs.createdAt));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [job] = await db
        .select()
        .from(generationJobs)
        .where(
          and(
            eq(generationJobs.id, input.id),
            eq(generationJobs.userId, ctx.user.id)
          )
        );
      if (!job) throw new Error("Job not found");
      return job;
    }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(generationJobs)
        .set({
          status: "cancelled" as typeof generationJobs.status.enumValues[number],
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(generationJobs.id, input.id),
            eq(generationJobs.userId, ctx.user.id)
          )
        )
        .returning();
      return updated;
    }),
});
