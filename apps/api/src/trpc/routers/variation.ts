import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  projectVariations,
  pipelineConfigs,
  projects,
  generationJobs,
} from "@contenthq/db/schema";
import { addIngestionJob } from "@contenthq/queue";
import {
  createVariationSchema,
  updateVariationSchema,
  deleteVariationSchema,
  startVariationRunSchema,
  submitEvaluationSchema,
} from "@contenthq/shared";

export const variationRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(projectVariations)
        .where(
          and(
            eq(projectVariations.projectId, input.projectId),
            eq(projectVariations.userId, ctx.user.id)
          )
        );
    }),

  create: protectedProcedure
    .input(createVariationSchema)
    .mutation(async ({ ctx, input }) => {
      const [variation] = await db
        .insert(projectVariations)
        .values({
          ...input,
          userId: ctx.user.id,
        })
        .returning();
      return variation;
    }),

  update: protectedProcedure
    .input(updateVariationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(projectVariations)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(
            eq(projectVariations.id, id),
            eq(projectVariations.userId, ctx.user.id)
          )
        )
        .returning();
      if (!updated) throw new Error("Variation not found");
      return updated;
    }),

  delete: protectedProcedure
    .input(deleteVariationSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(projectVariations)
        .where(
          and(
            eq(projectVariations.id, input.id),
            eq(projectVariations.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  startRun: protectedProcedure
    .input(startVariationRunSchema)
    .mutation(async ({ ctx, input }) => {
      const [variation] = await db
        .select()
        .from(projectVariations)
        .where(
          and(
            eq(projectVariations.id, input.variationId),
            eq(projectVariations.userId, ctx.user.id)
          )
        );

      if (!variation) throw new Error("Variation not found");

      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(
            eq(projects.id, variation.projectId),
            eq(projects.userId, ctx.user.id)
          )
        );

      if (!project) throw new Error("Project not found");

      // Read base pipeline config and merge with variation overrides
      const [baseConfig] = await db
        .select()
        .from(pipelineConfigs)
        .where(eq(pipelineConfigs.projectId, variation.projectId));

      const mergedConfig = {
        ...(baseConfig?.stageConfigs ?? {}),
        ...(variation.stageOverrides ?? {}),
      };

      // Freeze merged config on the variation
      await db
        .update(projectVariations)
        .set({
          status: "running",
          stageOverrides: mergedConfig,
          updatedAt: new Date(),
        })
        .where(eq(projectVariations.id, variation.id));

      // Queue the pipeline job
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: variation.projectId,
          jobType: "INGESTION",
          status: "queued",
        })
        .returning();

      await addIngestionJob({
        projectId: variation.projectId,
        userId: ctx.user.id,
        sourceUrl: project.inputContent || "",
        sourceType: project.inputType || "url",
      });

      return { jobId: job.id, variationId: variation.id };
    }),

  submitEvaluation: protectedProcedure
    .input(submitEvaluationSchema)
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(projectVariations)
        .set({
          evaluationScores: input.scores,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(projectVariations.id, input.variationId),
            eq(projectVariations.userId, ctx.user.id)
          )
        )
        .returning();

      if (!updated) throw new Error("Variation not found");
      return updated;
    }),
});
