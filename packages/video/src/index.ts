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
