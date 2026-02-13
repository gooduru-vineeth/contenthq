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

function validatePublicUrl(url: string): void {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }
  const hostname = parsed.hostname;
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('172.') ||
    hostname.startsWith('192.168.') ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.') ||
    hostname === '[::1]' ||
    hostname === '0000:0000:0000:0000:0000:0000:0000:0001'
  ) {
    throw new Error('Access to private/internal URLs is not allowed');
  }
}

export class VideoService {
  async generateSceneVideo(options: VideoGenerationOptions): Promise<VideoResult> {
    const available = await checkFFmpeg();
    if (!available) {
      throw new Error("FFmpeg is not installed. Please install FFmpeg to generate videos.");
    }

    // Download image
    validatePublicUrl(options.imageUrl);
    const response = await fetch(options.imageUrl, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
    const imageBuffer = Buffer.from(await response.arrayBuffer());

    const width = options.width ?? 1920;
    const height = options.height ?? 1080;
    const fps = options.fps ?? 30;

    const videoBuffer = await imageToVideo(imageBuffer, options.duration, width, height, fps, options.motionSpec);

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
        return { videoPath, audioPath, duration: scene.duration, transition: scene.transition };
      }),
    );

    const { assembleVideo } = await import("./ffmpeg");
    const videoBuffer = await assembleVideo(
      sceneFiles,
      outputPath,
      options.width ?? 1920,
      options.height ?? 1080,
      options.defaultTransition,
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
