import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { pipelineConfigs, aiModels, aiProviders } from "@contenthq/db/schema";
import {
  upsertPipelineConfigSchema,
  freezePipelineConfigSchema,
} from "@contenthq/shared";

export const pipelineConfigRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [config] = await db
        .select()
        .from(pipelineConfigs)
        .where(
          and(
            eq(pipelineConfigs.projectId, input.projectId),
            eq(pipelineConfigs.userId, ctx.user.id)
          )
        );
      return config ?? null;
    }),

  upsert: protectedProcedure
    .input(upsertPipelineConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db
        .select()
        .from(pipelineConfigs)
        .where(
          and(
            eq(pipelineConfigs.projectId, input.projectId),
            eq(pipelineConfigs.userId, ctx.user.id)
          )
        );

      if (existing) {
        const [updated] = await db
          .update(pipelineConfigs)
          .set({
            mode: input.mode,
            stageConfigs: input.stageConfigs ?? {},
            updatedAt: new Date(),
          })
          .where(eq(pipelineConfigs.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(pipelineConfigs)
        .values({
          projectId: input.projectId,
          userId: ctx.user.id,
          mode: input.mode,
          stageConfigs: input.stageConfigs ?? {},
        })
        .returning();
      return created;
    }),

  getProviderOptions: protectedProcedure
    .input(z.object({ stageType: z.enum(["llm", "image", "video", "tts"]) }))
    .query(async ({ input }) => {
      const models = await db
        .select({
          id: aiModels.id,
          name: aiModels.name,
          modelId: aiModels.modelId,
          type: aiModels.type,
          providerName: aiProviders.name,
          providerSlug: aiProviders.slug,
        })
        .from(aiModels)
        .innerJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
        .where(eq(aiModels.type, input.stageType));

      return models.map((m) => ({
        id: m.id,
        provider: m.providerSlug,
        providerName: m.providerName,
        model: m.modelId,
        displayName: `${m.providerName} - ${m.name}`,
      }));
    }),

  getDefaults: protectedProcedure.query(async () => {
    return {
      mode: "simple" as const,
      stageConfigs: {
        ingestion: {
          enabled: true,
          extractImages: true,
          maxRetries: 3,
        },
        storyWriting: {
          enabled: true,
          narrativeStructure: "linear" as const,
          temperature: 0.7,
          maxRetries: 3,
        },
        sceneGeneration: {
          enabled: true,
          visualStyle: "photorealistic" as const,
          maxRetries: 3,
        },
        visualGeneration: {
          enabled: true,
          imageSize: "1024x1024",
          quality: "standard" as const,
          batchCount: 1,
          maxRetries: 3,
        },
        visualVerification: {
          enabled: true,
          threshold: 60,
          autoRetryCount: 2,
          maxRetries: 3,
        },
        videoGeneration: {
          enabled: true,
          motionType: "kenburns" as const,
          durationPerScene: 5,
          maxRetries: 3,
        },
        tts: {
          enabled: true,
          quality: "standard" as const,
          speed: 1.0,
          pitch: 0,
          format: "mp3" as const,
          maxRetries: 3,
        },
        audioMixing: {
          enabled: true,
          voiceoverVolume: 100,
          musicVolume: 30,
          musicDuckingEnabled: true,
          fadeInMs: 500,
          fadeOutMs: 1000,
          musicLoop: true,
          maxRetries: 3,
        },
        captionGeneration: {
          enabled: false,
          font: "Arial",
          fontSize: 24,
          fontColor: "#FFFFFF",
          backgroundColor: "#00000080",
          position: "bottom-center" as const,
          highlightMode: "none" as const,
          highlightColor: "#FFD700",
          wordsPerLine: 4,
          useWordLevelTiming: true,
          maxRetries: 3,
        },
        assembly: {
          enabled: true,
          transitions: "fade" as const,
          outputFormat: "mp4" as const,
          resolution: "1080p" as const,
          fps: 30,
          watermarkEnabled: false,
          watermarkOpacity: 0.5,
          maxRetries: 3,
        },
      },
    };
  }),

  freeze: protectedProcedure
    .input(freezePipelineConfigSchema)
    .mutation(async ({ ctx, input }) => {
      const [config] = await db
        .select()
        .from(pipelineConfigs)
        .where(
          and(
            eq(pipelineConfigs.projectId, input.projectId),
            eq(pipelineConfigs.userId, ctx.user.id)
          )
        );

      if (!config) {
        throw new Error("Pipeline config not found");
      }

      const [updated] = await db
        .update(pipelineConfigs)
        .set({
          frozenConfig: config.stageConfigs,
          frozenAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(pipelineConfigs.id, config.id))
        .returning();

      return updated;
    }),
});
