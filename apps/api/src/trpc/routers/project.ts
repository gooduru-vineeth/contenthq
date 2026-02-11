import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "@contenthq/db/client";
import { projects } from "@contenthq/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { createProjectSchema, updateProjectSchema } from "@contenthq/shared";

export const projectRouter = router({
  create: protectedProcedure
    .input(createProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const [project] = await db
        .insert(projects)
        .values({
          ...input,
          userId: ctx.user.id,
        })
        .returning();
      return project;
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );
      if (!project) throw new Error("Project not found");
      return project;
    }),

  update: protectedProcedure
    .input(updateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await db
        .update(projects)
        .set({ ...data, updatedAt: new Date() })
        .where(
          and(eq(projects.id, id), eq(projects.userId, ctx.user.id))
        )
        .returning();
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(projects)
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        );
      return { success: true };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string(),
        progressPercent: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await db
        .update(projects)
        .set({
          status: input.status as typeof projects.status.enumValues[number],
          progressPercent: input.progressPercent,
          updatedAt: new Date(),
        })
        .where(
          and(eq(projects.id, input.id), eq(projects.userId, ctx.user.id))
        )
        .returning();
      return updated;
    }),
});
