import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { aiProviders, aiModels } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import { createProviderSchema, updateProviderSchema } from "@contenthq/shared";

export const adminProviderRouter = router({
  list: adminProcedure.query(async () => {
    return db.select().from(aiProviders).orderBy(asc(aiProviders.name));
  }),

  getById: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const [provider] = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id));
      if (!provider) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }
      return provider;
    }),

  create: adminProcedure
    .input(createProviderSchema)
    .mutation(async ({ input }) => {
      const [provider] = await db
        .insert(aiProviders)
        .values({
          name: input.name,
          slug: input.slug,
          type: input.type,
          isEnabled: input.isEnabled,
          rateLimitPerMinute: input.rateLimitPerMinute ?? null,
          costPerUnit: input.costPerUnit ?? null,
          config: input.config ?? null,
        })
        .returning();
      return provider;
    }),

  update: adminProcedure
    .input(updateProviderSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [existing] = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, id));
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      const [updated] = await db
        .update(aiProviders)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiProviders.id, id))
        .returning();
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(aiProviders)
        .where(eq(aiProviders.id, input.id));
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }

      // Delete associated models first (no cascade in schema)
      await db.delete(aiModels).where(eq(aiModels.providerId, input.id));
      await db.delete(aiProviders).where(eq(aiProviders.id, input.id));
      return { success: true };
    }),

  toggleEnabled: adminProcedure
    .input(z.object({ id: z.string().min(1), isEnabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const [updated] = await db
        .update(aiProviders)
        .set({ isEnabled: input.isEnabled, updatedAt: new Date() })
        .where(eq(aiProviders.id, input.id))
        .returning();
      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Provider not found",
        });
      }
      return updated;
    }),
});
