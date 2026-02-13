import type { SubtitleSegment } from "./types";
import { calculateWordTimings, calculateWordPositions, escapeFFmpegText } from "./helpers";

export function createWordHighlightFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  highlightColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.3);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);
      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${subtitle.startTime},${subtitle.endTime})'`
      );
    });

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);
      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:box=1:boxcolor=${highlightColor}@0.7:boxborderw=6:borderw=2:bordercolor=black:enable='between(t,${timing.start},${timing.end})'`
      );
    });
  });

  return filters.join(",");
}

export function createWordFillFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  fillColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.2);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${subtitle.startTime},${timing.start})'`
      );

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${fillColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.start},${subtitle.endTime})'`
      );
    });
  });

  return filters.join(",");
}

export function createWordColorFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  highlightColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.3);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${subtitle.startTime},${timing.start})'`
      );
      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.end},${subtitle.endTime})'`
      );

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${highlightColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.start},${timing.end})'`
      );
    });
  });

  return filters.join(",");
}

export function createWordColorBoxFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  _highlightColor: string,
  boxColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.5);
  const boxPadding = Math.round(fontSize * 0.4);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const boxColorClean = boxColor.replace("0x", "");

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${subtitle.startTime},${timing.start})'`
      );
      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.end},${subtitle.endTime})'`
      );

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=white:x=${xExpr}:y=${yExpr}:box=1:boxcolor=0x${boxColorClean}:boxborderw=${boxPadding}:enable='between(t,${timing.start},${timing.end})'`
      );
    });
  });

  return filters.join(",");
}

export function createRandomDualColorFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  highlightColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length < 2) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.3);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const randomStartIndex = Math.floor(Math.random() * (words.length - 1));
  const highlightIndices = [randomStartIndex, randomStartIndex + 1];

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  let globalWordIndex = 0;

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      const isHighlighted = highlightIndices.includes(globalWordIndex);
      const wordColor = isHighlighted ? highlightColor : baseColor;

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${wordColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.start},${subtitle.endTime})'`
      );

      globalWordIndex++;
    });
  });

  return filters.join(",");
}

export function createWordRevealFilter(
  subtitle: SubtitleSegment,
  font: string,
  textColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.3);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${textColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.start},${subtitle.endTime})'`
      );
    });
  });

  return filters.join(",");
}

export function createStrokeFilter(
  subtitle: SubtitleSegment,
  font: string,
  baseColor: string,
  fillColor: string,
  position: string,
  _bgColor: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.3);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${baseColor}@0.3:x=${xExpr}:y=${yExpr}:borderw=3:bordercolor=${baseColor}:enable='between(t,${subtitle.startTime},${timing.start})'`
      );

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=${fillColor}:x=${xExpr}:y=${yExpr}:borderw=2:bordercolor=black:enable='between(t,${timing.start},${subtitle.endTime})'`
      );
    });
  });

  return filters.join(",");
}

export function createStickerWordRevealFilter(
  subtitle: SubtitleSegment,
  font: string,
  boxColor: string,
  position: string,
  fontSize: number,
  wordsPerLine = 0
): string | null {
  const timings = calculateWordTimings(subtitle);
  if (timings.length === 0) return null;

  const words = timings.map((t) => t.word);
  const lineHeight = Math.round(fontSize * 1.5);
  const boxPadding = Math.round(fontSize * 0.35);

  const filters: string[] = [];
  const escapedFont = escapeFFmpegText(font);
  const boxColorClean = boxColor.replace("0x", "");

  const effectiveWPL = wordsPerLine > 0 ? wordsPerLine : words.length;
  const lines: string[][] = [];
  const lineTimings: typeof timings[] = [];
  for (let i = 0; i < words.length; i += effectiveWPL) {
    lines.push(words.slice(i, Math.min(i + effectiveWPL, words.length)));
    lineTimings.push(timings.slice(i, Math.min(i + effectiveWPL, timings.length)));
  }

  const totalLines = lines.length;
  const totalBlockHeight = totalLines * lineHeight;

  let baseY: number | string;
  if (position.includes("top")) {
    baseY = 50;
  } else if (position.includes("middle")) {
    baseY = `(h-${totalBlockHeight})/2`;
  } else {
    baseY = `h-${totalBlockHeight}-50`;
  }

  lines.forEach((lineWords, lineIndex) => {
    const { positions: linePositions, totalWidth } = calculateWordPositions(lineWords, fontSize);
    const currentLineTimings = lineTimings[lineIndex];

    const yOffset = lineIndex * lineHeight;
    const yExpr = typeof baseY === "string" ? `${baseY}+${yOffset}` : `${baseY + yOffset}`;

    lineWords.forEach((word, i) => {
      const timing = currentLineTimings[i];
      const xExpr = `(w-${totalWidth})/2+${linePositions[i].xOffset}`;
      const escaped = escapeFFmpegText(word);

      filters.push(
        `drawtext=text='${escaped}':font='${escapedFont}':fontsize=${fontSize}:fontcolor=white:x=${xExpr}:y=${yExpr}:box=1:boxcolor=0x${boxColorClean}:boxborderw=${boxPadding}:enable='between(t,${timing.start},${subtitle.endTime})'`
      );
    });
  });

  return filters.join(",");
}
