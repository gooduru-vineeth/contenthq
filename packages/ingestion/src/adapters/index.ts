import type { IngestionAdapter } from "../types";
import { youtubeAdapter } from "./youtube.adapter";
import { rssAdapter } from "./rss.adapter";
import { urlAdapter } from "./url.adapter";

// Order matters: more specific adapters first
const adapters: IngestionAdapter[] = [
  youtubeAdapter,
  rssAdapter,
  urlAdapter, // fallback - detects any URL
];

export function detectAdapter(input: string): IngestionAdapter {
  for (const adapter of adapters) {
    if (adapter.detect(input)) {
      return adapter;
    }
  }
  // Default to URL adapter
  return urlAdapter;
}

export { youtubeAdapter, rssAdapter, urlAdapter };
