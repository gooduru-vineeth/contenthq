export interface AIProviderConfig {
  name: string;
  type: string;
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
}

export interface GenerationOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
  /** Pass a Drizzle DB instance to resolve models from ai_providers/ai_models tables */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: any;
  /** DB model ID — used with `db` to resolve a specific model */
  dbModelId?: string;
  /** User ID for resolving user-specific model preferences from DB */
  userId?: string;
  /** Anthropic-specific capabilities (web search, web fetch, thinking, code execution) */
  anthropic?: AnthropicCapabilities;
}

export interface GenerationResult {
  content: string;
  tokens: { input: number; output: number };
  provider: string;
  model: string;
}

export interface StructuredGenerationResult<T> {
  data: T;
  tokens: { input: number; output: number };
  provider: string;
  model: string;
}

export interface ImageGenerationOptions {
  prompt: string;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
  quality?: "standard" | "hd";
  style?: "natural" | "vivid";
}

export interface ImageGenerationResult {
  url: string;
  revisedPrompt?: string;
  provider: string;
}

export interface StreamingGenerationResult {
  textStream: AsyncIterable<string>;
  fullText: Promise<string>;
  tokens: Promise<{ input: number; output: number }>;
  provider: string;
  model: string;
}

// Anthropic capability options
export interface WebSearchOptions {
  maxUses?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  userLocation?: {
    type: "approximate";
    country?: string;
    region?: string;
    city?: string;
    timezone?: string;
  };
}

export interface WebFetchOptions {
  maxUses?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
}

export interface ExtendedThinkingOptions {
  type: "enabled" | "adaptive" | "disabled";
  budgetTokens?: number;
}

export interface AnthropicCapabilities {
  webSearch?: WebSearchOptions | boolean;
  webFetch?: WebFetchOptions | boolean;
  thinking?: ExtendedThinkingOptions;
  codeExecution?: boolean;
}

export interface ExtendedGenerationResult extends GenerationResult {
  reasoningText?: string;
  sources?: Array<{ url: string; title: string | null; snippet?: string }>;
  cacheMetrics?: {
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
  };
}
