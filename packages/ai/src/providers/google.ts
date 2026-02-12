import { createGoogleGenerativeAI } from "@ai-sdk/google";

export function getGoogleProvider(apiKey?: string) {
  const key = apiKey || process.env.GOOGLE_AI_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_AI_API_KEY is required");
  }
  return createGoogleGenerativeAI({ apiKey: key });
}

export const GOOGLE_MODELS = {
  GEMINI_3_PRO: "gemini-3-pro",
  GEMINI_3_FLASH: "gemini-3-flash",
  GEMINI_2_5_PRO: "gemini-2.5-pro",
  GEMINI_2_5_FLASH: "gemini-2.5-flash",
  GEMINI_2_5_FLASH_LITE: "gemini-2.5-flash-lite",
  GEMINI_2_FLASH: "gemini-2.0-flash",
  GEMINI_2_FLASH_LITE: "gemini-2.0-flash-lite",
  /** @deprecated Use GEMINI_2_FLASH */
  GEMINI_PRO: "gemini-2.0-flash",
  /** @deprecated Use GEMINI_2_FLASH_LITE */
  GEMINI_FLASH: "gemini-2.0-flash-lite",
} as const;
