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
} from "./types";

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
