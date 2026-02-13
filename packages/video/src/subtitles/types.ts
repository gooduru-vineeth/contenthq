export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleSegment {
  text: string;
  startTime: number;
  endTime: number;
  wordTimings?: WordTiming[];
}

export interface SubtitleEmbedOptions {
  font?: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: string;
  animationStyle?: string;
  highlightColor?: string;
  highlightMode?: string;
  wordsPerLine?: number;
  useWordLevelTiming?: boolean;
  videoWidth?: number;
  videoHeight?: number;
}

export interface ASSGeneratorOptions {
  font: string;
  fontSize: number;
  position: string;
  textColor?: string;
  highlightColor?: string;
  glowColor?: string;
  boxColor?: string;
  wordsPerLine?: number;
  videoWidth?: number;
  videoHeight?: number;
}

export type AnimationCategory = "basic" | "styled" | "word" | "effect";

export interface AnimationStyleMeta {
  id: string;
  name: string;
  description: string;
  category: AnimationCategory;
  requiresWordTiming: boolean;
}

export type AnimationStyle =
  | "none"
  | "fade-in"
  | "slide-up"
  | "slide-left"
  | "bounce"
  | "typewriter"
  | "tilted-emoji"
  | "sticker-word"
  | "glow-bounce"
  | "imessage"
  | "gold-3d"
  | "hormozi"
  | "dual-font"
  | "betelgeuse"
  | "daily-mail"
  | "eclipse"
  | "suzy"
  | "alcyone"
  | "thuban"
  | "marigold"
  | "closed-caption"
  | "handwritten-pop"
  | "mizar"
  | "poem"
  | "cartwheel-black"
  | "cartwheel-purple"
  | "caster"
  | "pulse"
  | "fuel"
  | "scene"
  | "neon-glow"
  | "drive"
  | "freshly"
  | "slate"
  | "minima"
  | "blueprint"
  | "orbitar-black"
  | "word-highlight"
  | "word-fill"
  | "word-color"
  | "word-color-box"
  | "random-dual-color"
  | "word-reveal"
  | "stroke"
  | "sticker"
  | "fire-text"
  | "ice-text"
  | "glitch"
  | "3d-extrude"
  | "retro-wave";
