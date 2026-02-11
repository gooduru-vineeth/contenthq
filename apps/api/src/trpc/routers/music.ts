import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { musicTracks } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";

export const musicRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(musicTracks)
      .where(eq(musicTracks.userId, ctx.user.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [track] = await db
        .select()
        .from(musicTracks)
        .where(and(eq(musicTracks.id, input.id), eq(musicTracks.userId, ctx.user.id)));
      return track ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        genre: z.string().optional(),
        mood: z.string().optional(),
        duration: z.number().optional(),
        url: z.string().optional(),
        storageKey: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [track] = await db
        .insert(musicTracks)
        .values({
          userId: ctx.user.id,
          ...input,
        })
        .returning();
      return track;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(musicTracks)
        .where(and(eq(musicTracks.id, input.id), eq(musicTracks.userId, ctx.user.id)));
      return { success: true };
    }),
});
