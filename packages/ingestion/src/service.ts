import { detectAdapter } from "./adapters/index";
import type { ExtractionResult } from "./types";

export class IngestionService {
  async ingest(input: string): Promise<ExtractionResult> {
    const adapter = detectAdapter(input);
    console.warn(
      `[Ingestion] Using adapter: ${adapter.name} for input: ${input.substring(0, 100)}`
    );

    const result = await adapter.extract(input);
    console.warn(
      `[Ingestion] Extracted: "${result.title}" (${result.body.length} chars)`
    );

    return result;
  }
}

export const ingestionService = new IngestionService();
