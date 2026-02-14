import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { projects, pipelineConfigs } from "@contenthq/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createProjectSchema, updateProjectSchema } from "@contenthq/shared";

export const projectRouter = router({
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { pipelineMode, stageConfigs, visualStyle, ttsProvider, ttsVoiceId, enableCaptions, captionStyle, captionPosition, pipelineTemplateId, ...projectData } = input;
      const [project] = await db
        .insert(projects)
        .values({
          ...projectData,
          pipelineTemplateId: pipelineTemplateId ?? null,
          userId: ctx.user.id,
        })
        .returning();

      // Map simple mode fields to stage configs if in simple mode
      const resolvedConfigs = stageConfigs ?? (
        pipelineMode !== "advanced"
          ? {
              ...(visualStyle ? { sceneGeneration: { visualStyle } } : {}),
              ...(ttsProvider || ttsVoiceId ? { tts: { ...(ttsProvider ? { provider: ttsProvider } : {}), ...(ttsVoiceId ? { voiceId: ttsVoiceId } : {}) } } : {}),
              ...(enableCaptions ? { captionGeneration: { enabled: true, ...(captionStyle ? { animationStyle: captionStyle } : {}), ...(captionPosition ? { position: captionPosition } : {}) } } : {}),
            }
          : {}
      );

      // Create default pipeline config for the new project
      await db.insert(pipelineConfigs).values({
        projectId: project.id,
        userId: ctx.user.id,
        mode: pipelineMode ?? "simple",
        stageConfigs: resolvedConfigs,
      });

      return project;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new Error("Project not found");
      return project;
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(eq(projects.id, id), eq(projects.userId, ctx.user.id))
        )
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if the project has an active pipeline — clean up BullMQ jobs first
      const [project] = await db
        .select({ status: projects.status })
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );

      if (
        project &&
        !["draft", "completed", "failed", "cancelled"].includes(project.status)
      ) {
        const { removeJobsByProjectId } = await import("@contenthq/queue");
        await removeJobsByProjectId(input.id);
      }

      await db
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum([
          "draft",
          "ingesting",
          "writing",
          "generating_scenes",
          "verifying",
          "generating_video",
          "mixing_audio",
          "assembling",
          "completed",
          "failed",
          "cancelled",
        ]),
        progressPercent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(projects)
        .set({
          status: input.status,
          progressPercent: input.progressPercent,
          updatedAt: new Date(),
        })
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        )
        .returning();
      return updated;
    }),
});
