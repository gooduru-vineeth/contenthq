import type {
  VideoGenerationOptions,
  VideoResult,
  AudioMixOptions,
  AudioMixResult,
  AssemblyOptions,
  AssemblyResult,
} from "./types";
import { imageToVideo, mixAudio, checkFFmpeg, createTempDir } from "./ffmpeg";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

export class VideoService {
  async generateSceneVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const available = await checkFFmpeg();
    if (!available) {
      throw new Error("FFmpeg is not installed. Please install FFmpeg to generate videos.");
    }

    // Download image
    const response = await fetch(options.imageUrl);
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const width = options.width ?? 1920;
    const height = options.height ?? 1080;
    const fps = options.fps ?? 30;

    const videoBuffer = await imageToVideo(imageBuffer, options.duration, width, height, fps);

    return {
      videoBuffer,
      duration: options.duration,
      format: options.outputFormat ?? "mp4",
      width,
      height,
    };
  }

  async mixSceneAudio(options: AudioMixOptions): Promise<AudioMixResult> {
    const available = await checkFFmpeg();
    if (!available) {
      throw new Error("FFmpeg is not installed. Please install FFmpeg to mix audio.");
    }

    const audioBuffer = await mixAudio(
      options.voiceoverBuffer,
      options.musicBuffer,
      options.voiceoverVolume ?? 100,
      options.musicVolume ?? 30,
    );

    // Estimate duration from voiceover
    const estimatedDuration = Math.ceil(options.voiceoverBuffer.length / 16000);

    return {
      audioBuffer,
      duration: estimatedDuration,
      format: options.outputFormat ?? "mp3",
    };
  }

  async assembleProject(options: AssemblyOptions): Promise<AssemblyResult> {
    const available = await checkFFmpeg();
    if (!available) {
      throw new Error("FFmpeg is not installed. Please install FFmpeg to assemble videos.");
    }

    const tempDir = await createTempDir();
    const outputPath = join(tempDir, `output.${options.outputFormat ?? "mp4"}`);

    const sceneFiles = await Promise.all(
      options.scenes.map(async (scene, i) => {
        const videoPath = join(tempDir, `video_${i}.mp4`);
        const audioPath = join(tempDir, `audio_${i}.mp3`);
        await writeFile(videoPath, scene.videoBuffer);
        await writeFile(audioPath, scene.audioBuffer);
        return { videoPath, audioPath, duration: scene.duration };
      }),
    );

    const { assembleVideo } = await import("./ffmpeg");
    const videoBuffer = await assembleVideo(
      sceneFiles,
      outputPath,
      options.width ?? 1920,
      options.height ?? 1080,
    );

    const totalDuration = options.scenes.reduce((sum, s) => sum + s.duration, 0);

    return {
      videoBuffer,
      duration: totalDuration,
      format: options.outputFormat ?? "mp4",
      size: videoBuffer.length,
    };
  }
}

export const videoService = new VideoService();
