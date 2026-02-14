import * as ai from "ai";
import { Client } from "langsmith";
import { wrapAISDK } from "langsmith/experimental/vercel";

const TRACING_ENABLED =
  process.env.LANGCHAIN_TRACING_V2 === "true" ||
  process.env.LANGCHAIN_TRACING === "true";

const apiKey = process.env.LANGCHAIN_API_KEY;
const project = process.env.LANGCHAIN_PROJECT || "(default)";
const endpoint =
  process.env.LANGCHAIN_ENDPOINT || "https://api.smith.langchain.com";

// --- Startup diagnostics ---
function maskKey(key: string | undefined): string {
  if (!key) return "(not set)";
  if (key.length <= 10) return "***";
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

console.log(`[LangSmith] Configuration:`);
console.log(`  LANGCHAIN_TRACING_V2 = ${process.env.LANGCHAIN_TRACING_V2 ?? "(not set)"}`);
console.log(`  LANGCHAIN_TRACING    = ${process.env.LANGCHAIN_TRACING ?? "(not set)"}`);
console.log(`  LANGCHAIN_API_KEY    = ${maskKey(apiKey)}`);
console.log(`  LANGCHAIN_PROJECT    = ${project}`);
console.log(`  LANGCHAIN_ENDPOINT   = ${endpoint}`);
console.log(`  LANGSMITH_DEBUG      = ${process.env.LANGSMITH_DEBUG ?? "(not set)"}`);

if (TRACING_ENABLED && !apiKey) {
  console.warn(
    "[LangSmith] WARNING: Tracing is enabled but LANGCHAIN_API_KEY is not set. Traces will NOT be sent."
  );
}

if (!TRACING_ENABLED) {
  console.warn(
    "[LangSmith] Tracing is DISABLED. Set LANGCHAIN_TRACING_V2=true to enable."
  );
}

// LangSmith client — reads LANGCHAIN_API_KEY from env automatically
export const langsmithClient = new Client();

// Non-blocking connectivity check
if (TRACING_ENABLED && apiKey) {
  const dummyRunId = "00000000-0000-0000-0000-000000000000";
  langsmithClient
    .readRun(dummyRunId)
    .then(() => {
      // Unlikely to succeed, but if it does the API is reachable
      console.log("[LangSmith] Connectivity check PASSED (API reachable)");
    })
    .catch((err: unknown) => {
      const status =
        err instanceof Error && "statusCode" in err
          ? (err as Error & { statusCode: number }).statusCode
          : undefined;
      const message = err instanceof Error ? err.message : String(err);

      if (status === 404) {
        // 404 = API reachable, key valid, run just doesn't exist (expected)
        console.log("[LangSmith] Connectivity check PASSED (API reachable, key valid)");
      } else if (status === 401 || status === 403) {
        console.error(
          `[LangSmith] Connectivity check FAILED: API key is invalid (HTTP ${status}). ` +
            "Regenerate at https://smith.langchain.com/settings"
        );
      } else {
        console.error(
          `[LangSmith] Connectivity check FAILED: ${message}. ` +
            "Check LANGCHAIN_ENDPOINT and network connectivity."
        );
      }
    });
}

// Wrap AI SDK functions with LangSmith tracing.
// When tracing is enabled, all calls are traced.
// When not set, functions pass through unchanged.
const wrapped = wrapAISDK(ai, { client: langsmithClient });

export const generateText = wrapped.generateText;
export const generateObject = wrapped.generateObject;
export const streamText = wrapped.streamText;
export const streamObject = wrapped.streamObject;
