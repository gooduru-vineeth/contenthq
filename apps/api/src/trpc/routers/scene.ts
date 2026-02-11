import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@contenthq/db/client";
import { scenes, sceneVisuals, projects, stories } from "@contenthq/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { updateSceneSchema, reorderScenesSchema } from "@contenthq/shared";
import { addVisualGenerationJob } from "@contenthq/queue";

export const sceneRouter = router({
  listByStory: protectedProcedure
    .input(z.object({ storyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [story] = await db
        .select()
        .from(stories)
        .innerJoin(projects, eq(stories.projectId, projects.id))
        .where(
          and(eq(stories.id, input.storyId), eq(projects.userId, ctx.user.id))
        );
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });

      return db
        .select()
        .from(scenes)
        .where(eq(scenes.storyId, input.storyId))
        .orderBy(asc(scenes.index));
    }),

  listByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

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
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [scene] = await db
        .select()
        .from(scenes)
        .innerJoin(projects, eq(scenes.projectId, projects.id))
        .where(
          and(eq(scenes.id, id), eq(projects.userId, ctx.user.id))
        );
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(scenes)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(scenes.id, id))
        .returning();
      return updated;
    }),

  reorder: protectedProcedure
    .input(reorderScenesSchema)
    .mutation(async ({ ctx, input }) => {
      const [story] = await db
        .select()
        .from(stories)
        .innerJoin(projects, eq(stories.projectId, projects.id))
        .where(
          and(eq(stories.id, input.storyId), eq(projects.userId, ctx.user.id))
        );
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });

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
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const [scene] = await db
        .select()
        .from(scenes)
        .where(eq(scenes.id, input.sceneId));
      if (!scene) throw new TRPCError({ code: "NOT_FOUND" });

      await addVisualGenerationJob({
        projectId: input.projectId,
        sceneId: input.sceneId,
        userId: ctx.user.id,
        imagePrompt: scene.imagePrompt || "",
      });

      return { success: true };
    }),
});
