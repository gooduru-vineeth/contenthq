import { z } from "zod";

const aiProviderTypeSchema = z.enum([
  "llm",
  "image",
  "video",
  "tts",
  "music",
  "vision",
  "embedding",
]);

export const createProviderSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase kebab-case (e.g. 'openai', 'google-ai')"
    ),
  type: aiProviderTypeSchema,
  isEnabled: z.boolean(),
  rateLimitPerMinute: z.number().int().min(0).nullable().optional(),
  costPerUnit: z.string().nullable().optional(),
  config: z.record(z.unknown()).nullable().optional(),
});

export const updateProviderSchema = createProviderSchema.partial().extend({
  id: z.string().min(1),
});

export const createModelSchema = z.object({
  providerId: z.string().min(1),
  name: z.string().min(1).max(200),
  modelId: z.string().min(1).max(200),
  type: z.string().max(100).nullable().optional(),
  isDefault: z.boolean(),
  costs: z.record(z.unknown()).nullable().optional(),
  capabilities: z.record(z.unknown()).nullable().optional(),
});

export const updateModelSchema = createModelSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type CreateModelInput = z.infer<typeof createModelSchema>;
export type UpdateModelInput = z.infer<typeof updateModelSchema>;
