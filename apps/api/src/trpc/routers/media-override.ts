import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { pipelineMediaOverrides } from "@contenthq/db/schema";
import {
  createMediaOverrideSchema,
  deleteMediaOverrideSchema,
  getUploadUrlSchema,
} from "@contenthq/shared";
import { storage } from "@contenthq/storage";

export const mediaOverrideRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return db
        .select()
        .from(pipelineMediaOverrides)
        .where(
          and(
            eq(pipelineMediaOverrides.projectId, input.projectId),
            eq(pipelineMediaOverrides.userId, ctx.user.id)
          )
        );
    }),

  create: protectedProcedure
    .input(createMediaOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      const [override] = await db
        .insert(pipelineMediaOverrides)
        .values({
          ...input,
          userId: ctx.user.id,
        })
        .returning();
      return override;
    }),

  delete: protectedProcedure
    .input(deleteMediaOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(pipelineMediaOverrides)
        .where(
          and(
            eq(pipelineMediaOverrides.id, input.id),
            eq(pipelineMediaOverrides.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  getUploadUrl: protectedProcedure
    .input(getUploadUrlSchema)
    .mutation(async ({ ctx, input }) => {
      const storageKey = `users/${ctx.user.id}/projects/${input.projectId}/overrides/${crypto.randomUUID()}-${input.fileName}`;
      const publicUrl = storage.getPublicUrl(storageKey);

      return { uploadUrl: publicUrl, storageKey };
    }),
});
