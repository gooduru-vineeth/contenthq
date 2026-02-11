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
  systemPrompt?: string;
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
