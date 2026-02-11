import * as cheerio from "cheerio";
import type { IngestionAdapter, ExtractionResult } from "../types";

export const rssAdapter: IngestionAdapter = {
  name: "rss",

  detect(input: string): boolean {
    return (
      input.includes("/feed") ||
      input.includes("/rss") ||
      input.endsWith(".xml")
    );
  },

  async extract(input: string): Promise<ExtractionResult> {
    const response = await fetch(input);
    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items = $("item, entry");
    const firstItem = items.first();

    const title =
      firstItem.find("title").text() ||
      $("channel > title, feed > title").text();
    const body = firstItem
      .find("description, content\\:encoded, content, summary")
      .text();
    const link =
      firstItem.find("link").text() ||
      firstItem.find("link").attr("href") ||
      input;

    return {
      title: title.trim(),
      body: body.replace(/<[^>]*>/g, "").trim(),
      summary: body
        .replace(/<[^>]*>/g, "")
        .substring(0, 500)
        .trim(),
      sourceUrl: link,
      sourcePlatform: "rss",
      metadata: {
        feedUrl: input,
        itemCount: items.length,
        pubDate: firstItem.find("pubDate, published, updated").text(),
      },
      engagementScore: 0,
    };
  },
};
