import type { z } from "zod";
import { resolveModelFromDb } from "../providers/model-factory";
import { generateTextContent, generateStructuredContent } from "./llm.service";
import { generateImage } from "./image.service";
import { verifyImage } from "./vision.service";
import { resolvePromptForStage } from "../prompts/resolver";
import { composePrompt } from "../prompts/composer";
import { getSchema } from "../schemas/registry";
import type { AgentConfig } from "@contenthq/shared";
import { truncateForLog } from "../utils/log-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DrizzleDb = any;

export interface ExecuteAgentOptions {
  /** Load agent config from DB by ID */
  agentId?: string;
  /** Or provide inline config */
  agentConfig?: AgentConfig;
  /** Template variables to interpolate */
  variables: Record<string, string>;
  projectId?: string;
  userId?: string;
  db: DrizzleDb;
}

export interface AgentExecutionResult {
  data: unknown;
  tokens: { input: number; output: number };
  provider: string;
  model: string;
  agentId?: string;
  promptTemplateId?: string;
  durationMs: number;
}

/**
 * Core agent execution service.
 * Resolves agent config, model, prompt, output schema, then executes.
 */
export async function executeAgent(
  options: ExecuteAgentOptions
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const { variables, projectId, userId, db } = options;

  // Step 1: Resolve agent config
  const config = await resolveAgentConfig(options);

  console.warn(`[AgentExecutor] Step 1 - Config resolved: agentId=${options.agentId ?? "inline"}, agentType=${config.agentType}, aiModelId=${config.aiModelId ?? "default"}, promptTemplateId=${config.promptTemplateId ?? "none"}, hasSystemPrompt=${!!config.systemPrompt}`);

  // Step 2: Resolve model
  const resolved = config.aiModelId
    ? await resolveModelFromDb(db, { modelId: config.aiModelId })
    : await resolveModelFromDb(db, { type: mapAgentTypeToProviderType(config.agentType) });

  console.warn(`[AgentExecutor] Step 2 - Model resolved: provider=${resolved.provider}, modelId=${resolved.modelId}`);

  // Step 3: Resolve prompt
  const prompt = await resolvePrompt(config, variables, projectId, userId, db);

  console.warn(`[AgentExecutor] Step 3 - Prompt resolved: promptLength=${prompt.length}, prompt="${truncateForLog(prompt, 200)}"`);

  // Step 4: Resolve output schema
  const schema = resolveOutputSchema(config);

  // Step 5: Execute based on agent type
  let data: unknown;
  let tokens = { input: 0, output: 0 };

  switch (config.agentType) {
    case "llm_text": {
      const result = await generateTextContent(prompt, {
        provider: resolved.provider,
        model: resolved.modelId,
        temperature: config.modelConfig?.temperature,
        maxTokens: config.modelConfig?.maxTokens,
        systemPrompt: config.systemPrompt ?? undefined,
      });
      data = result.content;
      tokens = result.tokens;
      break;
    }

    case "llm_structured": {
      if (!schema) {
        throw new Error(
          `Agent type "llm_structured" requires an output schema. ` +
            `Set outputConfig.schemaName or outputConfig.schemaJson.`
        );
      }
      const result = await generateStructuredContent(prompt, schema, {
        provider: resolved.provider,
        model: resolved.modelId,
        temperature: config.modelConfig?.temperature,
        maxTokens: config.modelConfig?.maxTokens,
        systemPrompt: config.systemPrompt ?? undefined,
      });
      data = result.data;
      tokens = result.tokens;
      break;
    }

    case "image_generation": {
      const result = await generateImage({ prompt });
      data = result;
      break;
    }

    case "vision_verification": {
      const imageUrl = variables.imageUrl;
      const description = variables.sceneDescription || variables.visualDescription || prompt;
      if (!imageUrl) {
        throw new Error("vision_verification agent requires 'imageUrl' variable");
      }
      const result = await verifyImage(
        imageUrl,
        description,
        60,
        config.systemPrompt ?? undefined,
        resolved.provider,
        resolved.modelId
      );
      data = result;
      break;
    }

    case "custom":
      throw new Error("Custom agent execution requires external handler");

    default:
      throw new Error(`Unknown agent type: ${config.agentType}`);
  }

  const durationMs = Date.now() - startTime;

  console.warn(`[AgentExecutor] Step 5 - Execution complete: agentType=${config.agentType}, provider=${resolved.provider}, model=${resolved.modelId}, inputTokens=${tokens.input}, outputTokens=${tokens.output}, durationMs=${durationMs}`);

  // Step 6: Record in ai_generations table
  if (userId) {
    try {
      const { aiGenerations } = await import("@contenthq/db/schema");
      await db.insert(aiGenerations).values({
        userId,
        projectId: projectId ?? null,
        type: config.agentType,
        input: variables,
        output: data,
        agentId: options.agentId ?? null,
        promptTemplateId: config.promptTemplateId ?? null,
        composedPrompt: prompt,
      });
    } catch {
      console.warn("[AgentExecutor] Failed to record generation in DB");
    }
  }

  return {
    data,
    tokens,
    provider: resolved.provider,
    model: resolved.modelId,
    agentId: options.agentId,
    promptTemplateId: config.promptTemplateId ?? undefined,
    durationMs,
  };
}

async function resolveAgentConfig(
  options: ExecuteAgentOptions
): Promise<AgentConfig & { promptTemplateId?: string; systemPrompt?: string }> {
  if (options.agentConfig) {
    return options.agentConfig;
  }

  if (!options.agentId) {
    throw new Error("Either agentId or agentConfig must be provided");
  }

  const { agents } = await import("@contenthq/db/schema");
  const { eq } = await import("drizzle-orm");

  const [agent] = await options.db
    .select()
    .from(agents)
    .where(eq(agents.id, options.agentId));

  if (!agent) {
    throw new Error(`Agent not found: ${options.agentId}`);
  }

  if (agent.status !== "active") {
    throw new Error(`Agent "${agent.name}" is not active (status: ${agent.status})`);
  }

  return {
    agentType: agent.agentType as AgentConfig["agentType"],
    aiModelId: agent.aiModelId ?? undefined,
    modelConfig: agent.modelConfig ?? undefined,
    promptTemplateId: agent.promptTemplateId ?? undefined,
    systemPrompt: agent.systemPrompt ?? undefined,
    outputConfig: agent.outputConfig ?? undefined,
    personaSelections: agent.personaSelections ?? {},
    expectedVariables: agent.expectedVariables ?? [],
  };
}

async function resolvePrompt(
  config: AgentConfig & { promptTemplateId?: string; systemPrompt?: string },
  variables: Record<string, string>,
  projectId: string | undefined,
  userId: string | undefined,
  db: DrizzleDb
): Promise<string> {
  // Option 1: Use prompt template from DB
  if (config.promptTemplateId && projectId && userId) {
    // Look up the template type to call resolvePromptForStage
    const { promptTemplates } = await import("@contenthq/db/schema");
    const { eq } = await import("drizzle-orm");

    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, config.promptTemplateId));

    if (template) {
      const result = await resolvePromptForStage(
        db,
        projectId,
        userId,
        template.type,
        variables
      );
      return result.composedPrompt;
    }
  }

  // Option 2: Use direct system prompt as template
  if (config.systemPrompt) {
    return composePrompt({
      template: config.systemPrompt,
      variables,
    });
  }

  // Option 3: Concatenate all variables as a simple prompt
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}

function resolveOutputSchema(
  config: AgentConfig
): z.ZodType | undefined {
  if (!config.outputConfig) return undefined;

  // Try named schema from registry
  if (config.outputConfig.schemaName) {
    const schema = getSchema(config.outputConfig.schemaName);
    if (schema) return schema;
    console.warn(
      `[AgentExecutor] Schema "${config.outputConfig.schemaName}" not found in registry`
    );
  }

  return undefined;
}

function mapAgentTypeToProviderType(agentType: string): string | undefined {
  switch (agentType) {
    case "llm_text":
    case "llm_structured":
      return "llm";
    case "image_generation":
      return "image";
    case "vision_verification":
      return "vision";
    default:
      return undefined;
  }
}
