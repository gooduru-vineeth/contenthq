import * as ai from "ai";
import { Client } from "langsmith";
import { wrapAISDK } from "langsmith/experimental/vercel";

// LangSmith client — reads LANGCHAIN_API_KEY from env automatically
export const langsmithClient = new Client();

// Wrap AI SDK functions with LangSmith tracing.
// When LANGCHAIN_TRACING_V2=true, all calls are traced.
// When not set, functions pass through unchanged.
const wrapped = wrapAISDK(ai, { client: langsmithClient });

export const generateText = wrapped.generateText;
export const generateObject = wrapped.generateObject;
export const streamText = wrapped.streamText;
export const streamObject = wrapped.streamObject;
