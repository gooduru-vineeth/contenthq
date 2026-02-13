/**
 * Client-safe exports from @contenthq/video.
 * These do NOT import any Node.js modules (child_process, fs, etc.)
 * and can be safely used in browser/client components.
 */
export { ANIMATION_STYLES, ANIMATION_STYLE_MAP } from "./subtitles/style-registry";
export type {
  SubtitleSegment,
  WordTiming,
  SubtitleEmbedOptions,
  AnimationStyleMeta,
  AnimationCategory,
  AnimationStyle,
} from "./subtitles/types";
export type {
  VideoGenerationOptions,
  VideoResult,
  AudioMixOptions,
  AudioMixResult,
  AssemblyOptions,
  AssemblyScene,
  AssemblyResult,
  MotionSpec,
} from "./types";
