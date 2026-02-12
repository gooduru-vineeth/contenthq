import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { mediaGenerationService } from "../../services/media-generation.service";

export const mediaGenerationRouter = router({
  getModels: protectedProcedure
    .input(
      z
        .object({
          type: z.enum(["image", "video"]).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return mediaGenerationService.getAvailableModels(input?.type);
    }),

  generate: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(4000),
        mediaType: z.enum(["image", "video"]).default("image"),
        model: z.string(),
        aspectRatio: z
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"])
          .default("1:1"),
        quality: z.enum(["standard", "hd"]).default("standard"),
        style: z.enum(["natural", "vivid"]).optional(),
        duration: z.number().int().min(1).max(30).optional(),
        count: z.number().int().min(1).max(4).default(1),
        referenceImageUrl: z.string().url().optional(),
        conversationId: z.string().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return mediaGenerationService.generate(ctx.user.id, input);
    }),

  generateMultiModel: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1).max(4000),
        mediaType: z.enum(["image", "video"]).default("image"),
        models: z.array(z.string()).min(1).max(10),
        aspectRatios: z
          .array(z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]))
          .default(["1:1"]),
        qualities: z.array(z.enum(["standard", "hd"])).default(["standard"]),
        style: z.enum(["natural", "vivid"]).optional(),
        count: z.number().int().min(1).max(4).default(1),
        duration: z.number().int().min(1).max(30).optional(),
        referenceImageUrl: z.string().url().optional(),
        projectId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return mediaGenerationService.generateMultiModel(ctx.user.id, input);
    }),

  edit: protectedProcedure
    .input(
      z.object({
        mediaId: z.string(),
        editPrompt: z.string().min(1).max(4000),
        model: z.string().optional(),
        strength: z.number().min(0).max(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return mediaGenerationService.editMedia(
        ctx.user.id,
        input.mediaId,
        input
      );
    }),

  list: protectedProcedure
    .input(
      z.object({
        mediaType: z.enum(["image", "video"]).optional(),
        model: z.string().optional(),
        aspectRatio: z.string().optional(),
        search: z.string().optional(),
        status: z.string().optional(),
        sortBy: z.enum(["newest", "oldest"]).default("newest"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, ...filters } = input;
      return mediaGenerationService.listMedia(
        ctx.user.id,
        filters,
        page,
        pageSize
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const media = await mediaGenerationService.getMedia(
        ctx.user.id,
        input.id
      );
      if (!media) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return media;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await mediaGenerationService.deleteMedia(
        ctx.user.id,
        input.id
      );
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),

  listConversations: protectedProcedure.query(async ({ ctx }) => {
    return mediaGenerationService.listConversations(ctx.user.id);
  }),

  getConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const conversation = await mediaGenerationService.getConversation(
        ctx.user.id,
        input.id
      );
      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return conversation;
    }),

  deleteConversation: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await mediaGenerationService.deleteConversation(
        ctx.user.id,
        input.id
      );
      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return { success: true };
    }),
});
