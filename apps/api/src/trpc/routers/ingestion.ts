import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { ingestedContent, generationJobs } from "@contenthq/db/schema";
import { eq } from "drizzle-orm";
import { addIngestionJob } from "@contenthq/queue";

export const ingestionRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
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
