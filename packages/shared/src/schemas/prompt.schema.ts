import { z } from "zod";

const promptTypeSchema = z.enum([
  "story_writing",
  "scene_generation",
  "image_generation",
  "image_refinement",
  "visual_verification",
]);

const personaCategorySchema = z.enum([
  "tone",
  "audience",
  "visual_style",
  "narrative_style",
]);

export const createPromptTemplateSchema = z.object({
  type: promptTypeSchema,
  name: z.string().min(1).max(200),
  content: z.string().min(1),
  description: z.string().max(1000).optional(),
  variables: z.array(z.string()).optional(),
  outputSchemaHint: z.unknown().optional(),
});

export const updatePromptTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  description: z.string().max(1000).nullable().optional(),
  variables: z.array(z.string()).optional(),
  outputSchemaHint: z.unknown().optional(),
  changeNote: z.string().max(500).optional(),
});

export const createPersonaSchema = z.object({
  category: personaCategorySchema,
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(100),
  promptFragment: z.string().min(1),
  description: z.string().max(1000).optional(),
  isDefault: z.boolean().optional(),
  uiConfig: z
    .object({
      gradient: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })
    .optional(),
});

export const updatePersonaSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  label: z.string().min(1).max(100).optional(),
  promptFragment: z.string().min(1).optional(),
  description: z.string().max(1000).nullable().optional(),
  isDefault: z.boolean().optional(),
  uiConfig: z
    .object({
      gradient: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
    })
    .nullable()
    .optional(),
  changeNote: z.string().max(500).optional(),
});

export const updateProjectPromptConfigSchema = z.object({
  projectId: z.string().uuid(),
  promptOverrides: z.record(z.string(), z.string()).optional(),
  personaSelections: z.record(z.string(), z.string()).optional(),
  customVariables: z.record(z.string(), z.string()).optional(),
});

export const previewPromptSchema = z.object({
  type: promptTypeSchema,
  templateId: z.string().uuid().optional(),
  templateContent: z.string().optional(),
  variables: z.record(z.string(), z.string()).optional(),
  personaIds: z.array(z.string().uuid()).optional(),
});

// Version history schemas
export const templateVersionHistorySchema = z.object({
  templateId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const getTemplateVersionSchema = z.object({
  templateId: z.string().uuid(),
  version: z.number().int().min(1),
});

export const revertTemplateSchema = z.object({
  templateId: z.string().uuid(),
  targetVersion: z.number().int().min(1),
});

export const personaVersionHistorySchema = z.object({
  personaId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const getPersonaVersionSchema = z.object({
  personaId: z.string().uuid(),
  version: z.number().int().min(1),
});

export const revertPersonaSchema = z.object({
  personaId: z.string().uuid(),
  targetVersion: z.number().int().min(1),
});

export type CreatePromptTemplateInput = z.infer<
  typeof createPromptTemplateSchema
>;
export type UpdatePromptTemplateInput = z.infer<
  typeof updatePromptTemplateSchema
>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
export type UpdateProjectPromptConfigInput = z.infer<
  typeof updateProjectPromptConfigSchema
>;
export type PreviewPromptInput = z.infer<typeof previewPromptSchema>;
