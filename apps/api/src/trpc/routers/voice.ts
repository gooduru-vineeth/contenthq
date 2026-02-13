import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { voiceProfiles, clonedVoices } from "@contenthq/db/schema";
import { eq, and } from "drizzle-orm";

export const voiceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(voiceProfiles)
      .where(eq(voiceProfiles.userId, ctx.user.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [profile] = await db
        .select()
        .from(voiceProfiles)
        .where(and(eq(voiceProfiles.id, input.id), eq(voiceProfiles.userId, ctx.user.id)));
      return profile ?? null;
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        provider: z.string(),
        providerVoiceId: z.string(),
        language: z.string().default("en"),
        gender: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [profile] = await db
        .insert(voiceProfiles)
        .values({
          userId: ctx.user.id,
          name: input.name,
          provider: input.provider,
          providerVoiceId: input.providerVoiceId,
          voiceId: input.providerVoiceId,
          language: input.language,
          gender: input.gender,
        })
        .returning();
      return profile;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(voiceProfiles)
        .where(and(eq(voiceProfiles.id, input.id), eq(voiceProfiles.userId, ctx.user.id)));
      return { success: true };
    }),

  getAvailableVoices: protectedProcedure
    .input(z.object({ provider: z.string() }))
    .query(async ({ input }) => {
      // Return available voices per provider
      const voices: Record<string, Array<{ id: string; name: string; language: string; gender: string }>> = {
        openai: [
          { id: "alloy", name: "Alloy", language: "en", gender: "neutral" },
          { id: "echo", name: "Echo", language: "en", gender: "male" },
          { id: "fable", name: "Fable", language: "en", gender: "female" },
          { id: "onyx", name: "Onyx", language: "en", gender: "male" },
          { id: "nova", name: "Nova", language: "en", gender: "female" },
          { id: "shimmer", name: "Shimmer", language: "en", gender: "female" },
        ],
        elevenlabs: [
          { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", language: "en", gender: "female" },
          { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", language: "en", gender: "female" },
          { id: "ErXwobaYiN019PkySvjV", name: "Antoni", language: "en", gender: "male" },
          { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", language: "en", gender: "male" },
        ],
      };
      return voices[input.provider] ?? [];
    }),

  getClonedVoices: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(clonedVoices)
      .where(
        and(
          eq(clonedVoices.userId, ctx.user.id),
          eq(clonedVoices.status, "ready")
        )
      );
  }),
});
