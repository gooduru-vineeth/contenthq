import type { AIProviderType } from "./pipeline";

export interface AIProvider {
  id: string;
  name: string;
  slug: string;
  type: AIProviderType;
  isEnabled: boolean;
  rateLimitPerMinute: number;
  costPerUnit: number;
  config: Record<string, unknown>;
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  modelId: string;
  type: string;
  isDefault: boolean;
  costs: Record<string, unknown>;
  capabilities: Record<string, unknown>;
}

export interface AIGeneration {
  id: string;
  userId: string;
  projectId: string;
  providerId: string;
  modelId: string;
  type: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  tokens: number;
  costUsd: number;
  latencyMs: number;
  createdAt: Date;
}

export interface GenerationOptions {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerationResult {
  content: string;
  tokens: { input: number; output: number };
  costUsd: number;
  latencyMs: number;
  provider: string;
  model: string;
}
