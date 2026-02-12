import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { projects, generationJobs } from "@contenthq/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { addIngestionJob } from "@contenthq/queue";
import { startPipelineSchema, retryStageSchema } from "@contenthq/shared";

export const pipelineRouter = router({
  start: protectedProcedure
    .input(startPipelineSchema)
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] start called: projectId=${input.projectId}, userId=${ctx.user.id}`);
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      if (!project) {
        console.error(`[PipelineRouter] Project ${input.projectId} not found for userId=${ctx.user.id}`);
        throw new Error("Project not found");
      }

      await db
        .update(projects)
        .set({
          status: "ingesting",
          progressPercent: 0,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));

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
        sourceUrl: project.inputContent || "",
        sourceType: project.inputType || "url",
      });

      console.warn(`[PipelineRouter] Pipeline started for project ${input.projectId}, jobId=${job.id}, inputType=${project.inputType ?? "url"}`);
      return { jobId: job.id };
    }),

  getStatus: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );

      if (!project) throw new Error("Project not found");

      const jobs = await db
        .select()
        .from(generationJobs)
        .where(eq(generationJobs.projectId, input.projectId))
        .orderBy(desc(generationJobs.createdAt));

      return {
        status: project.status,
        progressPercent: project.progressPercent,
        jobs,
      };
    }),

  retryStage: protectedProcedure
    .input(retryStageSchema)
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] retryStage called: projectId=${input.projectId}, stage=${input.stage}, userId=${ctx.user.id}`);
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) {
        console.error(`[PipelineRouter] Project ${input.projectId} not found for retry, userId=${ctx.user.id}`);
        throw new Error("Project not found");
      }

      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: input.stage,
          status: "queued",
        })
        .returning();

      console.warn(`[PipelineRouter] Retry queued for project ${input.projectId}, stage=${input.stage}, jobId=${job.id}`);
      return { jobId: job.id };
    }),

  cancel: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      console.warn(`[PipelineRouter] cancel called: projectId=${input.projectId}, userId=${ctx.user.id}`);
      await db
        .update(projects)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      console.warn(`[PipelineRouter] Pipeline cancelled for project ${input.projectId}`);
      return { success: true };
    }),
});
