import { z } from "zod";
import { TRPCError } from "@trpc/server";
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
      try {
        return await voiceCloneService.processClone(input.id, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Voice cloning failed",
          cause: error,
        });
      }
    }),

  retry: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await voiceCloneService.retry(input.id, ctx.user.id);
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Voice clone retry failed",
          cause: error,
        });
      }
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
