import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGoogleProvider(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_AI_API_KEY is required");
  }
  return createGoogleGenerativeAI({ apiKey: key });
}

export const GOOGLE_MODELS = {
  GEMINI_PRO: "gemini-2.0-flash",
  GEMINI_FLASH: "gemini-2.0-flash-lite",
} as const;
