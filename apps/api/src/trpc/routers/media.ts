import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { mediaAssets } from "@contenthq/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage } from "@contenthq/storage";

export const mediaRouter = router({
  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(mediaAssets)
        .where(eq(mediaAssets.projectId, input.projectId))
        .orderBy(desc(mediaAssets.createdAt));
    }),

  listAll: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(mediaAssets)
      .where(eq(mediaAssets.userId, ctx.user.id))
      .orderBy(desc(mediaAssets.createdAt));
  }),

  getSignedUrl: protectedProcedure
    .input(z.object({ storageKey: z.string() }))
    .query(async ({ input }) => {
      const url = await storage.getSignedUrl(input.storageKey);
      return { url };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [asset] = await db
        .select()
        .from(mediaAssets)
        .where(
          and(eq(mediaAssets.id, input.id), eq(mediaAssets.userId, ctx.user.id))
        );

      if (!asset) throw new Error("Media asset not found");

      if (asset.storageKey) {
        await storage.deleteFile(asset.storageKey);
      }

      await db.delete(mediaAssets).where(eq(mediaAssets.id, input.id));

      return { success: true };
    }),
});
