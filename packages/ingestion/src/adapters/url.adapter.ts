import { JSDOM } from "jsdom";
import * as cheerio from "cheerio";
import type { IngestionAdapter, ExtractionResult } from "../types";

export const urlAdapter: IngestionAdapter = {
  name: "url",

  detect(input: string): boolean {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  },

  async extract(input: string): Promise<ExtractionResult> {
    const response = await fetch(input);
    const html = await response.text();

    // Parse with cheerio for metadata
    const $ = cheerio.load(html);
    const title =
      $("title").text() ||
      $('meta[property="og:title"]').attr("content") ||
      "";
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Parse with JSDOM for article content
    const dom = new JSDOM(html, { url: input });
    const document = dom.window.document;

    // Extract main content (simplified readability)
    const article =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.body;

    // Remove scripts, styles, nav, footer
    const removeTags = [
      "script",
      "style",
      "nav",
      "footer",
      "header",
      "aside",
    ];
    for (const tag of removeTags) {
      const elements = article.querySelectorAll(tag);
      elements.forEach((el) => el.remove());
    }

    const body = article.textContent?.trim().replace(/\s+/g, " ") || "";

    return {
      title: title.trim(),
      body: body.substring(0, 50000), // Cap at 50k chars
      summary: description.trim() || body.substring(0, 500),
      sourceUrl: input,
      sourcePlatform: new URL(input).hostname,
      metadata: {
        ogImage: $('meta[property="og:image"]').attr("content"),
        author: $('meta[name="author"]').attr("content"),
        publishedTime: $(
          'meta[property="article:published_time"]'
        ).attr("content"),
      },
      engagementScore: 0,
    };
  },
};
