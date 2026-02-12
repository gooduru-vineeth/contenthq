import { z } from "zod";

const speechGenerationProviderSchema = z.enum([
  "openai",
  "elevenlabs",
  "google",
  "google-gemini",
  "inworld",
  "sarvam",
]);

const speechGenerationStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const createSpeechGenerationSchema = z.object({
  text: z.string().min(1).max(10000),
  provider: speechGenerationProviderSchema,
  voiceId: z.string().min(1),
  model: z.string().optional(),
  title: z.string().max(200).optional(),
  projectId: z.string().uuid().optional(),
  voiceSettings: z.record(z.unknown()).optional(),
  audioFormat: z.string().optional(),
});

export const createBatchSpeechGenerationSchema = z.object({
  text: z.string().min(1).max(10000),
  title: z.string().max(200).optional(),
  projectId: z.string().uuid().optional(),
  generations: z
    .array(
      z.object({
        provider: speechGenerationProviderSchema,
        voiceId: z.string().min(1),
        model: z.string().optional(),
        voiceSettings: z.record(z.unknown()).optional(),
      })
    )
    .min(1)
    .max(20),
});

export const listSpeechGenerationsSchema = z.object({
  status: speechGenerationStatusSchema.optional(),
  provider: speechGenerationProviderSchema.optional(),
  projectId: z.string().uuid().optional(),
  batchId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export const updateSpeechGenerationSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(10000).optional(),
  provider: speechGenerationProviderSchema.optional(),
  voiceId: z.string().min(1).optional(),
  model: z.string().optional(),
  voiceSettings: z.record(z.unknown()).optional(),
  audioFormat: z.string().optional(),
});

export type CreateSpeechGenerationInput = z.infer<
  typeof createSpeechGenerationSchema
>;
export type CreateBatchSpeechGenerationInput = z.infer<
  typeof createBatchSpeechGenerationSchema
>;
export type ListSpeechGenerationsInput = z.infer<
  typeof listSpeechGenerationsSchema
>;
export type UpdateSpeechGenerationInput = z.infer<
  typeof updateSpeechGenerationSchema
>;
