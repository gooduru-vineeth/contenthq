import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@contenthq/db/client";
import { stories, scenes, projects, generationJobs } from "@contenthq/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { addStoryWritingJob } from "@contenthq/queue";

export const storyRouter = router({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.projectId), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.projectId, input.projectId));
      if (!story) return null;

      const storyScenes = await db
        .select()
        .from(scenes)
        .where(eq(scenes.storyId, story.id))
        .orderBy(asc(scenes.index));

      return { ...story, scenes: storyScenes };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        hook: z.string().optional(),
        synopsis: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const [story] = await db
        .select()
        .from(stories)
        .innerJoin(projects, eq(stories.projectId, projects.id))
        .where(
          and(eq(stories.id, id), eq(projects.userId, ctx.user.id))
        );
      if (!story) throw new TRPCError({ code: "NOT_FOUND" });

      const [updated] = await db
        .update(stories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(stories.id, id))
        .returning();
      return updated;
    }),

  regenerate: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: ctx.user.id,
          projectId: input.projectId,
          jobType: "STORY_WRITING",
          status: "queued",
        })
        .returning();

      await addStoryWritingJob({
        projectId: input.projectId,
        userId: ctx.user.id,
        ingestedContentIds: [],
        tone: "professional",
        targetDuration: 60,
      });

      return job;
    }),
});
