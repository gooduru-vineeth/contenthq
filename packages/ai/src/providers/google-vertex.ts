import { createVertex } from "@ai-sdk/google-vertex";
import { createVertexAnthropic } from "@ai-sdk/google-vertex/anthropic";

export function getVertexGoogleProvider(options?: {
  project?: string;
  location?: string;
}) {
  const project = options?.project || process.env.GOOGLE_VERTEX_PROJECT;
  const location =
    options?.location || process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
  if (!project) {
    throw new Error("GOOGLE_VERTEX_PROJECT is required");
  }
  return createVertex({ project, location });
}

export function getVertexAnthropicProvider(options?: {
  project?: string;
  location?: string;
}) {
  const project = options?.project || process.env.GOOGLE_VERTEX_PROJECT;
  const location =
    options?.location || process.env.GOOGLE_VERTEX_LOCATION || "us-central1";
  if (!project) {
    throw new Error("GOOGLE_VERTEX_PROJECT is required");
  }
  return createVertexAnthropic({ project, location });
}
