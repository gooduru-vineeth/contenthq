import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { mediaGenerationService } from "../../services/media-generation.service";
import { createRateLimitMiddleware } from "../middleware/rate-limit.middleware";
import { createCreditCheckMiddleware } from "../middleware/credit-check.middleware";
import { PROVIDER_CREDIT_COSTS } from "@contenthq/shared";

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
    .use(createRateLimitMiddleware("media_generation"))
    .use(createCreditCheckMiddleware(() => PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE))
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
    .use(createRateLimitMiddleware("media_generation", (input: unknown) => {
      const i = input as { models?: string[]; aspectRatios?: string[]; qualities?: string[] };
      return (i?.models?.length ?? 1) * (i?.aspectRatios?.length ?? 1) * (i?.qualities?.length ?? 1);
    }))
    .use(createCreditCheckMiddleware((input: unknown) => {
      const i = input as { models?: string[]; aspectRatios?: string[]; qualities?: string[] };
      const count = (i?.models?.length ?? 1) * (i?.aspectRatios?.length ?? 1) * (i?.qualities?.length ?? 1);
      return count * PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE;
    }))
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
    .use(createRateLimitMiddleware("media_generation"))
    .use(createCreditCheckMiddleware(() => PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE))
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

  getEditableModels: protectedProcedure.query(async () => {
    return mediaGenerationService.getEditableModels();
  }),

  chatEdit: protectedProcedure
    .input(
      z.object({
        sourceMediaId: z.string(),
        editPrompt: z.string().min(1).max(4000),
        models: z.array(z.string()).min(1).max(5),
        aspectRatios: z
          .array(z.enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"]))
          .min(1),
        qualities: z.array(z.enum(["standard", "hd"])).min(1),
        strength: z.number().min(0).max(1).optional(),
        referenceImageUrl: z.string().url().optional(),
        conversationId: z.string().optional(),
      })
    )
    .use(createRateLimitMiddleware("media_generation", (input: unknown) => {
      const i = input as { models?: string[]; aspectRatios?: string[]; qualities?: string[] };
      return (i?.models?.length ?? 1) * (i?.aspectRatios?.length ?? 1) * (i?.qualities?.length ?? 1);
    }))
    .use(createCreditCheckMiddleware((input: unknown) => {
      const i = input as { models?: string[]; aspectRatios?: string[]; qualities?: string[] };
      const count = (i?.models?.length ?? 1) * (i?.aspectRatios?.length ?? 1) * (i?.qualities?.length ?? 1);
      return count * PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE;
    }))
    .mutation(async ({ ctx, input }) => {
      const { sourceMediaId, ...request } = input;
      return mediaGenerationService.chatEditMultiCombination(
        ctx.user.id,
        sourceMediaId,
        request
      );
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

  sendMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        prompt: z.string().min(1).max(4000),
        model: z.string().optional(),
        mediaType: z.enum(["image", "video"]).optional(),
        aspectRatio: z
          .enum(["1:1", "16:9", "9:16", "4:3", "3:4", "21:9"])
          .optional(),
        quality: z.enum(["standard", "hd"]).optional(),
        style: z.enum(["natural", "vivid"]).optional(),
        duration: z.number().int().min(1).max(30).optional(),
      })
    )
    .use(createRateLimitMiddleware("media_generation"))
    .use(createCreditCheckMiddleware(() => PROVIDER_CREDIT_COSTS.MEDIA_GEN_STANDALONE_IMAGE))
    .mutation(async ({ ctx, input }) => {
      const { conversationId, ...request } = input;
      return mediaGenerationService.sendConversationMessage(
        ctx.user.id,
        conversationId,
        request
      );
    }),

  updateConversation: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return mediaGenerationService.updateConversation(
        ctx.user.id,
        id,
        updates
      );
    }),
});
