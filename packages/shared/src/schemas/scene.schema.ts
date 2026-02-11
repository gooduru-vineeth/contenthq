import { z } from "zod";

export const updateSceneSchema = z.object({
  id: z.string().min(1),
  visualDescription: z.string().optional(),
  imagePrompt: z.string().optional(),
  narrationScript: z.string().optional(),
  motionSpec: z.record(z.unknown()).optional(),
  transitions: z.string().optional(),
  duration: z.number().int().min(1).max(120).optional(),
});

export const reorderScenesSchema = z.object({
  storyId: z.string().min(1),
  sceneIds: z.array(z.string().min(1)),
});

export const regenerateSceneSchema = z.object({
  sceneId: z.string().min(1),
  field: z.enum(["visual", "narration", "video"]),
});

export type UpdateSceneInput = z.infer<typeof updateSceneSchema>;
export type ReorderScenesInput = z.infer<typeof reorderScenesSchema>;
export type RegenerateSceneInput = z.infer<typeof regenerateSceneSchema>;
