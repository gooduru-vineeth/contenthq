import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals } from "@contenthq/db/schema";
import { eq, asc } from "drizzle-orm";
import { updateSceneSchema, reorderScenesSchema } from "@contenthq/shared";
import { addVisualGenerationJob } from "@contenthq/queue";

export const sceneRouter = router({
  listByStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ input }) => {
      return db
        .select()
        .from(scenes)
        .where(eq(scenes.storyId, input.storyId))
        .orderBy(asc(scenes.index));
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ input }) => {
      const sceneList = await db
        .select()
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(asc(scenes.index));

      const scenesWithVisuals = await Promise.all(
        sceneList.map(async (scene) => {
          const visuals = await db
            .select()
            .from(sceneVisuals)
            .where(eq(sceneVisuals.sceneId, scene.id));
          return { ...scene, visuals };
        })
      );

      return scenesWithVisuals;
    }),

  update: protectedProcedure
    .input(updateSceneSchema)
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(scenes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scenes.id, id))
        .returning();
      return updated;
    }),

  reorder: protectedProcedure
    .input(reorderScenesSchema)
    .mutation(async ({ input }) => {
      const updates = input.sceneIds.map((sceneId, index) =>
        db
          .update(scenes)
          .set({ index, updatedAt: new Date() })
          .where(eq(scenes.id, sceneId))
      );
      await Promise.all(updates);
      return { success: true };
    }),

  regenerateVisual: protectedProcedure
    .input(z.object({ sceneId: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [scene] = await db
        .select()
        .from(scenes)
        .where(eq(scenes.id, input.sceneId));
      if (!scene) throw new Error("Scene not found");

      await addVisualGenerationJob({
        projectId: input.projectId,
        sceneId: input.sceneId,
        userId: ctx.user.id,
        imagePrompt: scene.imagePrompt || "",
      });

      return { success: true };
    }),
});
