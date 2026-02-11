export interface ContentSource {
  url: string;
  type: "url" | "youtube" | "rss" | "topic";
}

export interface ExtractionResult {
  title: string;
  body: string;
  summary: string;
  sourceUrl: string;
  sourcePlatform: string;
  metadata: Record<string, unknown>;
  engagementScore: number;
}

export interface IngestionAdapter {
  name: string;
  detect(input: string): boolean;
  extract(input: string): Promise<ExtractionResult>;
}
