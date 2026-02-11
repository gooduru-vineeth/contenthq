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
