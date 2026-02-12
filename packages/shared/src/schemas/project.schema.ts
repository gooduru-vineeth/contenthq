import { z } from "zod";

export const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  inputType: z.enum(["url", "topic", "rss", "youtube"]),
  inputContent: z.string().min(1),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  targetDuration: z.number().int().min(15).max(600).default(60),
  tone: z.string().default("professional"),
  language: z.string().default("en"),
  voiceProfileId: z.string().nullable().optional(),
  musicTrackId: z.string().nullable().optional(),
  enableVideoGeneration: z.boolean().default(false),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
  id: z.string().min(1),
});

export const projectIdSchema = z.object({
  id: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
