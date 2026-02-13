import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { stockMediaService } from "@contenthq/stock-media";

export const stockMediaRouter = router({
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        type: z.enum(["image", "video"]).default("image"),
        orientation: z
          .enum(["all", "portrait", "landscape", "square"])
          .optional(),
        providerId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return stockMediaService.search(input);
    }),

  curated: protectedProcedure
    .input(
      z.object({
        type: z.enum(["image", "video"]).default("image"),
        orientation: z
          .enum(["all", "portrait", "landscape", "square"])
          .optional(),
        providerId: z.string().optional(),
        page: z.number().int().min(1).default(1),
        perPage: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return stockMediaService.getCurated(input);
    }),

  providers: protectedProcedure
    .input(z.object({ type: z.enum(["image", "video"]).optional() }).optional())
    .query(async ({ input }) => {
      return stockMediaService.getProviders(input?.type);
    }),
});
