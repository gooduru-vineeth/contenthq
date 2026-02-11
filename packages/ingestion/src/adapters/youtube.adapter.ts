import type { IngestionAdapter, ExtractionResult } from "../types";

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export const youtubeAdapter: IngestionAdapter = {
  name: "youtube",

  detect(input: string): boolean {
    return YOUTUBE_REGEX.test(input);
  },

  async extract(input: string): Promise<ExtractionResult> {
    const match = input.match(YOUTUBE_REGEX);
    const videoId = match?.[1];
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Fetch video page for metadata
    const response = await fetch(
      `https://www.youtube.com/watch?v=${videoId}`
    );
    const html = await response.text();

    // Extract title from page
    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title =
      titleMatch?.[1]?.replace(" - YouTube", "").trim() || "YouTube Video";

    // Extract description from meta
    const descMatch =
      html.match(/content="(.*?)".*?name="description"/s) ||
      html.match(/name="description".*?content="(.*?)"/s);
    const description = descMatch?.[1] || "";

    return {
      title,
      body: description,
      summary: description.substring(0, 500),
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      sourcePlatform: "youtube",
      metadata: {
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
      },
      engagementScore: 0,
    };
  },
};
