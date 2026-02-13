export const AGENT_TYPES = [
  "llm_text",
  "llm_structured",
  "llm_web_search",
  "llm_code_execution",
  "image_generation",
  "vision_verification",
  "custom",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_STATUSES = ["active", "inactive", "draft"] as const;

export type AgentStatus = (typeof AGENT_STATUSES)[number];

export interface AgentModelConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface AgentOutputConfig {
  outputType: "text" | "object" | "array";
  schemaName?: string;
  schemaJson?: Record<string, unknown>;
}

export interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  agentType: AgentType;
  aiModelId: string | null;
  modelConfig: AgentModelConfig | null;
  promptTemplateId: string | null;
  systemPrompt: string | null;
  outputConfig: AgentOutputConfig | null;
  personaSelections: Record<string, string>;
  expectedVariables: string[];
  status: AgentStatus;
  version: number;
  isDefault: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentVersion {
  id: string;
  agentId: string;
  version: number;
  snapshot: Record<string, unknown>;
  editedBy: string | null;
  changeNote: string | null;
  createdAt: Date;
}

export interface AgentConfig {
  agentType: AgentType;
  provider?: string;
  model?: string;
  aiModelId?: string;
  modelConfig?: AgentModelConfig;
  promptTemplateId?: string;
  systemPrompt?: string;
  outputConfig?: AgentOutputConfig;
  personaSelections?: Record<string, string>;
  expectedVariables?: string[];
  anthropicCapabilities?: AnthropicCapabilitiesConfig;
}

export interface AnthropicCapabilitiesConfig {
  webSearch?: {
    maxUses?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  } | boolean;
  webFetch?: {
    maxUses?: number;
    allowedDomains?: string[];
    blockedDomains?: string[];
  } | boolean;
  thinking?: {
    type: "enabled" | "adaptive" | "disabled";
    budgetTokens?: number;
  };
  codeExecution?: boolean;
}

export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  llm_text: "LLM Text Generation",
  llm_structured: "LLM Structured Output",
  llm_web_search: "LLM Web Search",
  llm_code_execution: "LLM Code Execution",
  image_generation: "Image Generation",
  vision_verification: "Vision Verification",
  custom: "Custom",
};
