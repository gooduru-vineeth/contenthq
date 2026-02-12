import type { IngestionAdapter } from "../types";
import { youtubeAdapter } from "./youtube.adapter";
import { rssAdapter } from "./rss.adapter";
import { urlAdapter } from "./url.adapter";
import { topicAdapter } from "./topic.adapter";

// Order matters: more specific adapters first
const adapters: IngestionAdapter[] = [
  youtubeAdapter,
  rssAdapter,
  urlAdapter, // detects any valid URL
  topicAdapter, // fallback - catches non-URL strings (topics)
];

export function detectAdapter(input: string): IngestionAdapter {
  for (const adapter of adapters) {
    if (adapter.detect(input)) {
      return adapter;
    }
  }
  // Default to topic adapter for unrecognized input
  return topicAdapter;
}

export { youtubeAdapter, rssAdapter, urlAdapter, topicAdapter };
