import { z } from "zod";

const flowNodeTypeSchema = z.enum([
  "input",
  "output",
  "agent",
  "builtin",
  "condition",
  "parallelFanOut",
  "parallelFanIn",
  "delay",
]);

const flowStatusSchema = z.enum(["active", "inactive", "draft"]);

const flowNodeSchema = z.object({
  id: z.string(),
  type: flowNodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.object({
    label: z.string(),
    nodeType: flowNodeTypeSchema,
    agentId: z.string().optional(),
    builtinAction: z.string().optional(),
    conditionExpression: z.string().optional(),
    iterateField: z.string().optional(),
    delayConfig: z
      .object({
        type: z.enum(["timer", "manual"]),
        seconds: z.number().optional(),
      })
      .optional(),
    config: z.record(z.unknown()).optional(),
  }),
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
});

const flowDataSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

const flowConfigSchema = z.object({
  autoAdvance: z.boolean(),
  parallelScenes: z.boolean(),
  maxRetries: z.number().int().min(0),
  timeoutMs: z.number().int().min(0).optional(),
});

export const createFlowSchema = z.object({
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
  flowData: flowDataSchema,
  config: flowConfigSchema.optional(),
  isDefault: z.boolean().optional(),
});

export const updateFlowSchema = z.object({
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
  flowData: flowDataSchema.optional(),
  config: flowConfigSchema.nullable().optional(),
  status: flowStatusSchema.optional(),
  isDefault: z.boolean().optional(),
});

export const startFlowExecutionSchema = z.object({
  flowId: z.string(),
  projectId: z.string().uuid(),
  inputData: z.record(z.unknown()).optional(),
});

export const projectFlowConfigSchema = z.object({
  projectId: z.string().uuid(),
  flowId: z.string(),
  nodeOverrides: z.record(z.unknown()).optional(),
});

export type CreateFlowInput = z.infer<typeof createFlowSchema>;
export type UpdateFlowInput = z.infer<typeof updateFlowSchema>;
export type StartFlowExecutionInput = z.infer<typeof startFlowExecutionSchema>;
export type ProjectFlowConfigInput = z.infer<typeof projectFlowConfigSchema>;
