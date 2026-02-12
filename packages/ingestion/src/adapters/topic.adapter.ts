import { generateTextContent } from "@contenthq/ai";
import type { IngestionAdapter, ExtractionResult } from "../types";

export const topicAdapter: IngestionAdapter = {
  name: "topic",

  detect(input: string): boolean {
    try {
      new URL(input);
      return false; // Valid URL — not a topic
    } catch {
      return true; // Not a URL — treat as topic
    }
  },

  async extract(input: string): Promise<ExtractionResult> {
    const prompt = [
      `Research the following topic and write a comprehensive article about it: "${input}"`,
      "",
      "Include:",
      "- A clear, descriptive title",
      "- A thorough overview covering key facts, recent developments, and context",
      "- Structured sections with relevant details",
      "",
      "Format your response as:",
      "TITLE: <article title>",
      "SUMMARY: <2-3 sentence summary>",
      "BODY:",
      "<full article content>",
    ].join("\n");

    const result = await generateTextContent(prompt, {
      temperature: 0.7,
      maxTokens: 4000,
    });

    const text = result.content;

    // Parse structured response
    const titleMatch = text.match(/^TITLE:\s*(.+)$/m);
    const summaryMatch = text.match(/^SUMMARY:\s*(.+(?:\n(?!BODY:).+)*)$/m);
    const bodyMatch = text.match(/^BODY:\s*\n?([\s\S]+)$/m);

    const title = titleMatch?.[1]?.trim() || input;
    const summary = summaryMatch?.[1]?.trim() || text.substring(0, 500);
    const body = bodyMatch?.[1]?.trim() || text;

    return {
      title,
      body,
      summary,
      sourceUrl: `topic:${input}`,
      sourcePlatform: "ai-generated",
      metadata: {
        originalTopic: input,
        aiProvider: result.provider,
        aiModel: result.model,
        tokensUsed: result.tokens.input + result.tokens.output,
      },
      engagementScore: 0,
    };
  },
};
