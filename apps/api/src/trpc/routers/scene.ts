import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@contenthq/db/client";
import {
  scenes,
  sceneVisuals,
  sceneVideos,
  sceneAudioMixes,
  projects,
  stories,
} from "@contenthq/db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";
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

      const sceneIds = sceneList.map((s) => s.id);
      const allVisuals = sceneIds.length > 0
        ? await db
            .select()
            .from(sceneVisuals)
            .where(inArray(sceneVisuals.sceneId, sceneIds))
        : [];

      const visualsBySceneId = new Map<string, typeof allVisuals>();
      for (const visual of allVisuals) {
        const existing = visualsBySceneId.get(visual.sceneId) ?? [];
        existing.push(visual);
        visualsBySceneId.set(visual.sceneId, existing);
      }

      return sceneList.map((scene) => ({
        ...scene,
        visuals: visualsBySceneId.get(scene.id) ?? [],
      }));
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
          .where(and(eq(scenes.id, sceneId), eq(scenes.storyId, input.storyId)))
      );
      await Promise.all(updates);
      return { success: true };
    }),

  listByProjectEnriched: protectedProcedure
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

      const sceneIds = sceneList.map((s) => s.id);
      if (sceneIds.length === 0) return [];

      const [allVisuals, allVideos, allAudioMixes] = await Promise.all([
        db.select().from(sceneVisuals).where(inArray(sceneVisuals.sceneId, sceneIds)),
        db.select().from(sceneVideos).where(inArray(sceneVideos.sceneId, sceneIds)),
        db.select().from(sceneAudioMixes).where(inArray(sceneAudioMixes.sceneId, sceneIds)),
      ]);

      const visualsBySceneId = new Map<string, typeof allVisuals>();
      for (const visual of allVisuals) {
        const existing = visualsBySceneId.get(visual.sceneId) ?? [];
        existing.push(visual);
        visualsBySceneId.set(visual.sceneId, existing);
      }

      const videosBySceneId = new Map<string, typeof allVideos>();
      for (const video of allVideos) {
        const existing = videosBySceneId.get(video.sceneId) ?? [];
        existing.push(video);
        videosBySceneId.set(video.sceneId, existing);
      }

      const audioMixesBySceneId = new Map<string, typeof allAudioMixes>();
      for (const mix of allAudioMixes) {
        const existing = audioMixesBySceneId.get(mix.sceneId) ?? [];
        existing.push(mix);
        audioMixesBySceneId.set(mix.sceneId, existing);
      }

      return sceneList.map((scene) => ({
        ...scene,
        visuals: visualsBySceneId.get(scene.id) ?? [],
        videos: videosBySceneId.get(scene.id) ?? [],
        audioMixes: audioMixesBySceneId.get(scene.id) ?? [],
      }));
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
