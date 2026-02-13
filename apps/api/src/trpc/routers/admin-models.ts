import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { aiModels, aiProviders } from "@contenthq/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { createModelSchema, updateModelSchema } from "@contenthq/shared";

export const adminModelRouter = router({
  list: adminProcedure.query(async () => {
    return db
      .select({
        id: aiModels.id,
        providerId: aiModels.providerId,
        name: aiModels.name,
        modelId: aiModels.modelId,
        type: aiModels.type,
        isDefault: aiModels.isDefault,
        costs: aiModels.costs,
        capabilities: aiModels.capabilities,
        createdAt: aiModels.createdAt,
        updatedAt: aiModels.updatedAt,
        providerName: aiProviders.name,
        providerSlug: aiProviders.slug,
      })
      .from(aiModels)
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .orderBy(asc(aiModels.name));
  }),

  getByProvider: adminProcedure
    .input(z.object({ providerId: z.string().min(1) }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(aiModels)
        .where(eq(aiModels.providerId, input.providerId))
        .orderBy(asc(aiModels.name));
    }),

  getById: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input }) => {
      const [model] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, input.id));
      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }
      return model;
    }),

  create: adminProcedure
    .input(createModelSchema)
    .mutation(async ({ input }) => {
      const [model] = await db
        .insert(aiModels)
        .values({
          providerId: input.providerId,
          name: input.name,
          modelId: input.modelId,
          type: input.type ?? null,
          isDefault: input.isDefault,
          costs: input.costs ?? null,
          capabilities: input.capabilities ?? null,
        })
        .returning();
      return model;
    }),

  update: adminProcedure
    .input(updateModelSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [existing] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, id));
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      const [updated] = await db
        .update(aiModels)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(aiModels.id, id))
        .returning();
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const [existing] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, input.id));
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      await db.delete(aiModels).where(eq(aiModels.id, input.id));
      return { success: true };
    }),

  toggleDefault: adminProcedure
    .input(z.object({ id: z.string().min(1), isDefault: z.boolean() }))
    .mutation(async ({ input }) => {
      const [model] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, input.id));
      if (!model) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Model not found",
        });
      }

      if (input.isDefault && !model.type) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Cannot set as default: model has no type assigned. Set a type first.",
        });
      }

      if (input.isDefault && model.type) {
        await db
          .update(aiModels)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(and(eq(aiModels.type, model.type), eq(aiModels.isDefault, true)));
      }

      const [updated] = await db
        .update(aiModels)
        .set({ isDefault: input.isDefault, updatedAt: new Date() })
        .where(eq(aiModels.id, input.id))
        .returning();
      return updated!;
    }),

  getDefaults: adminProcedure.query(async () => {
    return db
      .select({
        id: aiModels.id,
        name: aiModels.name,
        modelId: aiModels.modelId,
        type: aiModels.type,
        providerName: aiProviders.name,
        providerSlug: aiProviders.slug,
      })
      .from(aiModels)
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .where(eq(aiModels.isDefault, true))
      .orderBy(asc(aiModels.type));
  }),
});
