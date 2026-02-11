import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@contenthq/db/client";
import { ingestedContent, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";
import { addIngestionJob } from "@contenthq/queue";

export const ingestionRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(ingestedContent)
        .where(eq(ingestedContent.projectId, input.projectId));
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        sourceUrl: z.string(),
        sourceType: z.string().default("url"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: "INGESTION",
          status: "queued",
        })
        .returning();

      await addIngestionJob({
        projectId: input.projectId,
        userId: ctx.user.id,
        sourceUrl: input.sourceUrl,
        sourceType: input.sourceType,
      });

      return job;
    }),

  retry: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: "INGESTION",
          status: "queued",
        })
        .returning();

      await addIngestionJob({
        projectId: input.projectId,
        userId: ctx.user.id,
        sourceUrl: "",
        sourceType: "retry",
      });

      return job;
    }),
});
