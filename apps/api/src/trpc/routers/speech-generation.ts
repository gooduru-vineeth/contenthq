import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { speechGenerationService } from "../../services/speech-generation.service";
import {
  createSpeechGenerationSchema,
  createBatchSpeechGenerationSchema,
  listSpeechGenerationsSchema,
  updateSpeechGenerationSchema,
} from "@contenthq/shared";

export const speechGenerationRouter = router({
  create: protectedProcedure
    .input(createSpeechGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      return speechGenerationService.createGeneration(input, ctx.user.id);
    }),

  createBatch: protectedProcedure
    .input(createBatchSpeechGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      return speechGenerationService.createBatch(input, ctx.user.id);
    }),

  list: protectedProcedure
    .input(listSpeechGenerationsSchema)
    .query(async ({ ctx, input }) => {
      return speechGenerationService.list(ctx.user.id, input);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return speechGenerationService.getById(input.id, ctx.user.id);
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return speechGenerationService.retry(input.id, ctx.user.id);
    }),

  edit: protectedProcedure
    .input(updateSpeechGenerationSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return speechGenerationService.edit(id, ctx.user.id, updates);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return speechGenerationService.delete(input.id, ctx.user.id);
    }),

  getProviders: protectedProcedure.query(async () => {
    return speechGenerationService.getProviders();
  }),

  getVoices: protectedProcedure
    .input(
      z.object({
        provider: z.string().optional(),
        language: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return speechGenerationService.getVoices(input.provider, input.language);
    }),

  estimateCost: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        provider: z.string(),
        voiceId: z.string(),
      })
    )
    .query(async ({ input }) => {
      return speechGenerationService.estimateCost(
        input.text,
        input.provider,
        input.voiceId
      );
    }),
});
