import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { createTempDir } from "../ffmpeg";
import type { SubtitleSegment, SubtitleEmbedOptions, ASSGeneratorOptions } from "./types";
import {
  escapeFFmpegPath,
  convertHexToASS,
  convertBGRtoHex,
  splitTextByWordsPerLineASS,
  formatASSTime,
} from "./helpers";

// ASS generators
import {
  generateTiltedColorASSContent,
  generateStickerASSContent,
  generateGlowBounceASSContent,
  generateIMessageASSContent,
  generate3DGoldTextASSContent,
  generateHormoziASSContent,
  generateDualFontASSContent,
  generateBetelgeuseASSContent,
  generateDailyMailASSContent,
  generateEclipseASSContent,
  generateSuzyASSContent,
  generateAlcyoneASSContent,
  generateThubanASSContent,
  generateMarigoldASSContent,
  generateClosedCaptionASSContent,
  generateHandwrittenPopASSContent,
  generateMizarASSContent,
  generatePoemASSContent,
  generateCartwheelBlackASSContent,
  generateCartwheelPurpleASSContent,
  generateCasterASSContent,
  generatePulseASSContent,
  generateFuelASSContent,
  generateSceneASSContent,
  generateNeonGlowASSContent,
  generateDriveASSContent,
  generateFreshlyASSContent,
  generateSlateASSContent,
  generateMinimaASSContent,
  generateBlueprintASSContent,
  generateOrbitarBlackASSContent,
} from "./ass-generators";

// Word filters
import {
  createWordHighlightFilter,
  createWordFillFilter,
  createWordColorFilter,
  createWordColorBoxFilter,
  createRandomDualColorFilter,
  createWordRevealFilter,
  createStrokeFilter,
  createStickerWordRevealFilter,
} from "./word-filters";

// Effect filters
import {
  createFireTextFilter,
  createIceTextFilter,
  createGlitchFilter,
  create3DExtrudeFilter,
  createRetroWaveFilter,
} from "./effect-filters";

// Animation filters
import { createAnimationFilter } from "./animation-filters";

const execFileAsync = promisify(execFile);

const ASS_STYLES = new Set([
  "none",
  "tilted-emoji",
  "sticker-word",
  "glow-bounce",
  "imessage",
  "gold-3d",
  "hormozi",
  "dual-font",
  "betelgeuse",
  "daily-mail",
  "eclipse",
  "suzy",
  "alcyone",
  "thuban",
  "marigold",
  "closed-caption",
  "handwritten-pop",
  "mizar",
  "poem",
  "cartwheel-black",
  "cartwheel-purple",
  "caster",
  "pulse",
  "fuel",
  "scene",
  "neon-glow",
  "drive",
  "freshly",
  "slate",
  "minima",
  "blueprint",
  "orbitar-black",
]);

const WORD_STYLES = new Set([
  "word-highlight",
  "word-fill",
  "word-color",
  "word-color-box",
  "random-dual-color",
  "word-reveal",
  "stroke",
  "sticker",
]);

const EFFECT_STYLES = new Set([
  "fire-text",
  "ice-text",
  "glitch",
  "3d-extrude",
  "retro-wave",
]);

const ANIMATION_STYLES_SET = new Set([
  "fade-in",
  "slide-up",
  "slide-left",
  "bounce",
  "typewriter",
]);

/** Map of ASS style IDs to their generator functions */
const ASS_GENERATOR_MAP: Record<
  string,
  (subtitles: SubtitleSegment[], options: ASSGeneratorOptions) => string
> = {
  "tilted-emoji": generateTiltedColorASSContent,
  "sticker-word": generateStickerASSContent,
  "glow-bounce": generateGlowBounceASSContent,
  imessage: generateIMessageASSContent,
  "gold-3d": generate3DGoldTextASSContent,
  hormozi: generateHormoziASSContent,
  "dual-font": generateDualFontASSContent,
  betelgeuse: generateBetelgeuseASSContent,
  "daily-mail": generateDailyMailASSContent,
  eclipse: generateEclipseASSContent,
  suzy: generateSuzyASSContent,
  alcyone: generateAlcyoneASSContent,
  thuban: generateThubanASSContent,
  marigold: generateMarigoldASSContent,
  "closed-caption": generateClosedCaptionASSContent,
  "handwritten-pop": generateHandwrittenPopASSContent,
  mizar: generateMizarASSContent,
  poem: generatePoemASSContent,
  "cartwheel-black": generateCartwheelBlackASSContent,
  "cartwheel-purple": generateCartwheelPurpleASSContent,
  caster: generateCasterASSContent,
  pulse: generatePulseASSContent,
  fuel: generateFuelASSContent,
  scene: generateSceneASSContent,
  "neon-glow": generateNeonGlowASSContent,
  drive: generateDriveASSContent,
  freshly: generateFreshlyASSContent,
  slate: generateSlateASSContent,
  minima: generateMinimaASSContent,
  blueprint: generateBlueprintASSContent,
  "orbitar-black": generateOrbitarBlackASSContent,
};

/** Position mapping for ASS subtitle format */
const POSITIONS: Record<string, { Alignment: number; MarginV: number; MarginL: number; MarginR: number }> = {
  "bottom-left": { Alignment: 1, MarginV: 30, MarginL: 30, MarginR: 0 },
  "bottom-center": { Alignment: 2, MarginV: 30, MarginL: 0, MarginR: 0 },
  "bottom-right": { Alignment: 3, MarginV: 30, MarginL: 0, MarginR: 30 },
  "middle-left": { Alignment: 4, MarginV: 0, MarginL: 30, MarginR: 0 },
  "middle-center": { Alignment: 5, MarginV: 0, MarginL: 0, MarginR: 0 },
  "middle-right": { Alignment: 6, MarginV: 0, MarginL: 0, MarginR: 30 },
  "top-left": { Alignment: 7, MarginV: 30, MarginL: 30, MarginR: 0 },
  "top-center": { Alignment: 8, MarginV: 30, MarginL: 0, MarginR: 0 },
  "top-right": { Alignment: 9, MarginV: 30, MarginL: 0, MarginR: 30 },
};

function buildASSGeneratorOptions(
  subtitles: SubtitleSegment[],
  options: SubtitleEmbedOptions,
): ASSGeneratorOptions {
  const textColor = convertHexToASS(options.fontColor ?? "#FFFFFF");
  const highlightColor = convertHexToASS(options.highlightColor ?? "#FFD700");

  return {
    font: options.font ?? "Arial",
    fontSize: options.fontSize ?? 24,
    position: options.position ?? "bottom-center",
    textColor,
    highlightColor,
    glowColor: highlightColor,
    boxColor: convertBGRtoHex(highlightColor),
    wordsPerLine: options.wordsPerLine ?? 0,
    videoWidth: options.videoWidth ?? 1920,
    videoHeight: options.videoHeight ?? 1080,
  };
}

function generateDefaultASSContent(
  subtitles: SubtitleSegment[],
  options: SubtitleEmbedOptions,
): string {
  const font = options.font ?? "Arial";
  const fontSize = options.fontSize ?? 24;
  const textColor = convertHexToASS(options.fontColor ?? "#FFFFFF");
  const posSettings = POSITIONS[options.position ?? "bottom-center"] ?? POSITIONS["bottom-center"];
  const wordsPerLine = options.wordsPerLine ?? 0;

  let assContent = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${font},${fontSize},${textColor},&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,2,1,${posSettings.Alignment},${posSettings.MarginL},${posSettings.MarginR},${posSettings.MarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  for (const sub of subtitles) {
    const start = formatASSTime(sub.startTime);
    const end = formatASSTime(sub.endTime);
    const text = wordsPerLine > 0
      ? splitTextByWordsPerLineASS(sub.text, wordsPerLine)
      : sub.text;
    assContent += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
  }

  return assContent;
}

function generateDrawtextFilters(
  style: string,
  subtitles: SubtitleSegment[],
  options: SubtitleEmbedOptions,
): string[] {
  const font = options.font ?? "Arial";
  const fontSize = options.fontSize ?? 24;
  const position = options.position ?? "bottom-center";
  const wordsPerLine = options.wordsPerLine ?? 0;
  const fontColor = options.fontColor ?? "#FFFFFF";
  const highlightColor = options.highlightColor ?? "#FFD700";
  const bgColor = "none";

  const textColorBGR = convertHexToASS(fontColor);
  const textColorHex = convertBGRtoHex(textColorBGR);
  const effectColorHex = convertBGRtoHex(convertHexToASS(highlightColor));

  const filters: string[] = [];

  if (WORD_STYLES.has(style)) {
    for (const sub of subtitles) {
      let filter: string | null = null;

      switch (style) {
        case "word-highlight":
          filter = createWordHighlightFilter(sub, font, textColorHex, effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "word-fill":
          filter = createWordFillFilter(sub, font, textColorHex, effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "word-color":
          filter = createWordColorFilter(sub, font, textColorHex, effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "word-color-box":
          filter = createWordColorBoxFilter(sub, font, textColorHex, "0xffffff", effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "random-dual-color":
          filter = createRandomDualColorFilter(sub, font, textColorHex, effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "word-reveal":
          filter = createWordRevealFilter(sub, font, textColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "stroke":
          filter = createStrokeFilter(sub, font, textColorHex, effectColorHex, position, bgColor, fontSize, wordsPerLine);
          break;
        case "sticker":
          filter = createStickerWordRevealFilter(sub, font, effectColorHex, position, fontSize, wordsPerLine);
          break;
      }

      if (filter) filters.push(filter);
    }
  } else if (EFFECT_STYLES.has(style)) {
    for (const sub of subtitles) {
      let filter: string | null = null;

      switch (style) {
        case "fire-text":
          filter = createFireTextFilter(sub, font, position, fontSize, wordsPerLine);
          break;
        case "ice-text":
          filter = createIceTextFilter(sub, font, position, fontSize, wordsPerLine);
          break;
        case "glitch":
          filter = createGlitchFilter(sub, font, position, fontSize, wordsPerLine);
          break;
        case "3d-extrude":
          filter = create3DExtrudeFilter(sub, font, textColorHex, position, fontSize, wordsPerLine);
          break;
        case "retro-wave":
          filter = createRetroWaveFilter(sub, font, position, fontSize, wordsPerLine);
          break;
      }

      if (filter) filters.push(filter);
    }
  } else if (ANIMATION_STYLES_SET.has(style)) {
    for (let i = 0; i < subtitles.length; i++) {
      const filter = createAnimationFilter(
        subtitles[i],
        font,
        textColorBGR,
        position,
        bgColor,
        style,
        fontSize,
        i,
        wordsPerLine,
      );
      if (filter) filters.push(filter);
    }
  }

  return filters;
}

/**
 * Embed subtitles into a video buffer using FFmpeg.
 *
 * For ASS-based styles: generates an .ass file and uses `ffmpeg -vf "ass=path"`.
 * For drawtext-based styles: builds a filter chain and uses `ffmpeg -vf "drawtext=..."`.
 */
export async function embedSubtitles(
  videoBuffer: Buffer,
  subtitles: SubtitleSegment[],
  options: SubtitleEmbedOptions,
): Promise<Buffer> {
  const tempDir = await createTempDir();
  const inputPath = join(tempDir, "input.mp4");
  const outputPath = join(tempDir, "output.mp4");

  try {
    await writeFile(inputPath, videoBuffer);
    const style = options.animationStyle ?? "none";

    if (ASS_STYLES.has(style)) {
      // Generate ASS file
      const assPath = join(tempDir, "subtitles.ass");
      let assContent: string;

      if (style === "none") {
        assContent = generateDefaultASSContent(subtitles, options);
      } else {
        const generator = ASS_GENERATOR_MAP[style];
        if (generator) {
          assContent = generator(subtitles, buildASSGeneratorOptions(subtitles, options));
        } else {
          assContent = generateDefaultASSContent(subtitles, options);
        }
      }

      await writeFile(assPath, assContent);
      const escapedPath = escapeFFmpegPath(assPath);

      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-vf", `ass=${escapedPath}`,
        "-c:v", "libx264",
        "-c:a", "copy",
        outputPath,
      ], { timeout: 600000 });
    } else {
      // Generate drawtext filter chain
      const filters = generateDrawtextFilters(style, subtitles, options);

      if (filters.length === 0) {
        // No filters generated, return original buffer
        return videoBuffer;
      }

      const filterStr = filters.join(",");

      await execFileAsync("ffmpeg", [
        "-y",
        "-i", inputPath,
        "-vf", filterStr,
        "-c:v", "libx264",
        "-c:a", "copy",
        outputPath,
      ], { timeout: 600000 });
    }

    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
