import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { voiceCloneService } from "../../services/voice-clone.service";

export const voiceCloneRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return voiceCloneService.list(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return voiceCloneService.getById(input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        language: z.string().min(1),
        description: z.string().max(500).optional(),
        tags: z.array(z.string()).max(10).optional(),
        removeBackgroundNoise: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return voiceCloneService.create(input, ctx.user.id);
    }),

  clone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return voiceCloneService.processClone(input.id, ctx.user.id);
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return voiceCloneService.retry(input.id, ctx.user.id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return voiceCloneService.delete(input.id, ctx.user.id);
    }),

  listSamples: protectedProcedure
    .input(z.object({ clonedVoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      return voiceCloneService.listSamples(
        input.clonedVoiceId,
        ctx.user.id
      );
    }),
});
