import { z } from "zod";

const agentTypeSchema = z.enum([
  "llm_text",
  "llm_structured",
  "image_generation",
  "vision_verification",
  "custom",
]);

const agentStatusSchema = z.enum(["active", "inactive", "draft"]);

const modelConfigSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).optional(),
    topP: z.number().min(0).max(1).optional(),
  })
  .optional();

const outputConfigSchema = z
  .object({
    outputType: z.enum(["text", "object", "array"]),
    schemaName: z.string().optional(),
    schemaJson: z.record(z.unknown()).optional(),
  })
  .optional();

export const createAgentSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase kebab-case"
    ),
  description: z.string().max(1000).optional(),
  agentType: agentTypeSchema,
  aiModelId: z.string().optional(),
  modelConfig: modelConfigSchema,
  promptTemplateId: z.string().uuid().optional(),
  systemPrompt: z.string().optional(),
  outputConfig: outputConfigSchema,
  personaSelections: z.record(z.string(), z.string()).optional(),
  expectedVariables: z.array(z.string()).optional(),
  isDefault: z.boolean().optional(),
});

export const updateAgentSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug must be lowercase kebab-case"
    )
    .optional(),
  description: z.string().max(1000).nullable().optional(),
  agentType: agentTypeSchema.optional(),
  aiModelId: z.string().nullable().optional(),
  modelConfig: modelConfigSchema.nullable(),
  promptTemplateId: z.string().uuid().nullable().optional(),
  systemPrompt: z.string().nullable().optional(),
  outputConfig: outputConfigSchema.nullable(),
  personaSelections: z.record(z.string(), z.string()).optional(),
  expectedVariables: z.array(z.string()).optional(),
  status: agentStatusSchema.optional(),
  isDefault: z.boolean().optional(),
  changeNote: z.string().max(500).optional(),
});

export const executeAgentSchema = z.object({
  agentId: z.string(),
  variables: z.record(z.string(), z.string()),
  projectId: z.string().uuid().optional(),
});

export const agentVersionHistorySchema = z.object({
  agentId: z.string(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export const revertAgentSchema = z.object({
  agentId: z.string(),
  targetVersion: z.number().int().min(1),
});

export type CreateAgentInput = z.infer<typeof createAgentSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentSchema>;
export type ExecuteAgentInput = z.infer<typeof executeAgentSchema>;
