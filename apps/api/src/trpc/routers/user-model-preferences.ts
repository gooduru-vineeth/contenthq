import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import {
  userModelPreferences,
  aiModels,
  aiProviders,
} from "@contenthq/db/schema";
import { eq, and, asc } from "drizzle-orm";
import {
  purposeTypeSchema,
  setUserModelPreferenceSchema,
  removeUserModelPreferenceSchema,
} from "@contenthq/shared";

export const userModelPreferenceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select({
        id: userModelPreferences.id,
        purposeType: userModelPreferences.purposeType,
        aiModelId: userModelPreferences.aiModelId,
        modelName: aiModels.name,
        modelId: aiModels.modelId,
        modelType: aiModels.type,
        providerName: aiProviders.name,
        providerSlug: aiProviders.slug,
        createdAt: userModelPreferences.createdAt,
        updatedAt: userModelPreferences.updatedAt,
      })
      .from(userModelPreferences)
      .leftJoin(aiModels, eq(userModelPreferences.aiModelId, aiModels.id))
      .leftJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
      .where(eq(userModelPreferences.userId, ctx.user.id))
      .orderBy(asc(userModelPreferences.purposeType));
  }),

  set: protectedProcedure
    .input(setUserModelPreferenceSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(userModelPreferences)
        .where(
          and(
            eq(userModelPreferences.userId, ctx.user.id),
            eq(userModelPreferences.purposeType, input.purposeType)
          )
        );

      const [preference] = await db
        .insert(userModelPreferences)
        .values({
          userId: ctx.user.id,
          purposeType: input.purposeType,
          aiModelId: input.aiModelId,
        })
        .returning();
      return preference;
    }),

  remove: protectedProcedure
    .input(removeUserModelPreferenceSchema)
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(userModelPreferences)
        .where(
          and(
            eq(userModelPreferences.userId, ctx.user.id),
            eq(userModelPreferences.purposeType, input.purposeType)
          )
        );
      return { success: true };
    }),

  getModelsByType: protectedProcedure
    .input(z.object({ type: purposeTypeSchema }))
    .query(async ({ input }) => {
      return db
        .select({
          id: aiModels.id,
          name: aiModels.name,
          modelId: aiModels.modelId,
          type: aiModels.type,
          isDefault: aiModels.isDefault,
          costs: aiModels.costs,
          capabilities: aiModels.capabilities,
          providerName: aiProviders.name,
          providerSlug: aiProviders.slug,
        })
        .from(aiModels)
        .innerJoin(aiProviders, eq(aiModels.providerId, aiProviders.id))
        .where(
          and(
            eq(aiModels.type, input.type),
            eq(aiProviders.isEnabled, true)
          )
        )
        .orderBy(asc(aiModels.name));
    }),
});
