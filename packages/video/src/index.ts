export { VideoService, videoService } from "./service";
export { checkFFmpeg, imageToVideo, mixAudio, assembleVideo } from "./ffmpeg";
export type {
  VideoGenerationOptions,
  VideoResult,
  AudioMixOptions,
  AudioMixResult,
  AssemblyOptions,
  AssemblyScene,
  AssemblyResult,
  MotionSpec,
  MotionType,
  TransitionType,
  TransitionSpec,
  AnimationPreset,
} from "./types";

// Animation Presets
export {
  ANIMATION_PRESETS,
  RANDOM_MOTION_POOL,
  RANDOM_TRANSITION_POOL,
  pickRandomMotion,
  pickRandomTransition,
  mapAiTransitionName,
  mapAiMotionName,
  mapLegacyMotionSpec,
} from "./animation-presets";

// Subtitles
export { embedSubtitles, ANIMATION_STYLES, ANIMATION_STYLE_MAP } from "./subtitles";
export type {
  SubtitleSegment,
  WordTiming,
  SubtitleEmbedOptions,
  AnimationStyleMeta,
  AnimationCategory,
  AnimationStyle,
} from "./subtitles";
