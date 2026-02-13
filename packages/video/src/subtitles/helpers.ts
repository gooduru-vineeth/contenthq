import type { SubtitleSegment, WordTiming } from "./types";

export function formatASSTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const centisecs = Math.floor((seconds % 1) * 100);
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(centisecs).padStart(2, "0")}`;
}

export function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function escapeFFmpegPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "\\\\\\\\")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

export function convertBGRtoHex(bgrColor: string): string {
  const colorHex = bgrColor.replace("&H", "").replace("&", "");
  const b = parseInt(colorHex.substring(0, 2), 16);
  const g = parseInt(colorHex.substring(2, 4), 16);
  const r = parseInt(colorHex.substring(4, 6), 16);
  return `0x${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Convert #RRGGBB hex to ASS &HBBGGRR& format */
export function convertHexToASS(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = hex.substring(0, 2);
  const g = hex.substring(2, 4);
  const b = hex.substring(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

export function escapeFFmpegText(text: string): string {
  return text.replace(/'/g, "\\'").replace(/:/g, "\\:");
}

export function calculateWordTimings(subtitle: SubtitleSegment): WordTiming[] {
  const { text, startTime, endTime, wordTimings } = subtitle;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  if (wordTimings && wordTimings.length > 0) {
    return wordTimings.map((wt) => ({
      word: wt.word,
      start: wt.start,
      end: wt.end,
    }));
  }

  const duration = endTime - startTime;
  const buffer = duration * 0.05;
  const effectiveStart = startTime + buffer;
  const wordDuration = (duration - buffer * 2) / words.length;

  return words.map((word, i) => ({
    word,
    start: effectiveStart + i * wordDuration,
    end: effectiveStart + (i + 1) * wordDuration,
  }));
}

export function calculateWordPositions(
  words: string[],
  fontSize: number
): {
  positions: Array<{ word: string; xOffset: number; width: number }>;
  totalWidth: number;
} {
  const charWidth = fontSize * 0.52;
  const spaceWidth = fontSize * 0.5;
  let x = 0;
  const positions = words.map((word) => {
    const wordWidth = word.length * charWidth;
    const pos = { word, xOffset: Math.round(x), width: Math.round(wordWidth) };
    x += wordWidth + spaceWidth;
    return pos;
  });
  return { positions, totalWidth: Math.max(1, Math.round(x - spaceWidth)) };
}

export function splitTextByWordsPerLineASS(
  text: string,
  wordsPerLine: number
): string {
  if (!wordsPerLine || wordsPerLine <= 0) return text;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= wordsPerLine) return text;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines.join("\\N");
}

export function splitTextByWordsPerLine(
  text: string,
  wordsPerLine: number
): string {
  if (!wordsPerLine || wordsPerLine <= 0) return text;
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= wordsPerLine) return text;
  const lines: string[] = [];
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(" "));
  }
  return lines.join("\n");
}
