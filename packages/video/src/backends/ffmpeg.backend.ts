import type {
  RenderingBackend,
  SceneRenderInput,
  SceneRenderOutput,
  AssemblyInput,
  AssemblyOutput,
} from "./rendering-backend";
import { videoService } from "../service";
import { checkFFmpeg, createTempDir } from "../ffmpeg";
import type { MotionSpec, TransitionSpec } from "../types";
import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * FFmpeg rendering backend. Wraps the existing VideoService and FFmpeg
 * utilities to conform to the RenderingBackend interface.
 *
 * The existing VideoService works with Buffers internally, while the
 * RenderingBackend interface works with URLs/paths. This adapter bridges
 * the two by downloading from URLs, delegating to VideoService, and
 * writing results to temp files.
 */
export class FFmpegBackend implements RenderingBackend {
  readonly id = "ffmpeg";
  readonly name = "FFmpeg";

  async renderScene(input: SceneRenderInput): Promise<SceneRenderOutput> {
    const width = input.width ?? 1920;
    const height = input.height ?? 1080;

    // Delegate to existing videoService.generateSceneVideo
    // which handles image download, motion effects, and FFmpeg encoding
    const result = await videoService.generateSceneVideo({
      imageUrl: input.sourceUrl,
      duration: input.duration,
      motionSpec: input.motionSpec as MotionSpec | undefined,
      width,
      height,
      fps: input.fps,
    });

    // Write the video buffer to a temp file and return the path
    const tempDir = await createTempDir();
    const outputPath = join(tempDir, `scene_${input.sceneId}.${result.format}`);
    await writeFile(outputPath, result.videoBuffer);

    return {
      videoUrl: outputPath,
      duration: result.duration,
      format: result.format,
      width: result.width,
      height: result.height,
    };
  }

  async assembleProject(input: AssemblyInput): Promise<AssemblyOutput> {
    const width = input.width ?? 1920;
    const height = input.height ?? 1080;

    // Read scene video and audio files into buffers for the existing
    // VideoService API which expects Buffer inputs
    const scenes = await Promise.all(
      input.scenes.map(async (scene) => {
        const videoBuffer = await readFile(scene.videoUrl);
        const audioBuffer = scene.audioUrl
          ? await readFile(scene.audioUrl)
          : Buffer.alloc(0);

        return {
          videoBuffer,
          audioBuffer,
          duration: scene.duration,
          transition: scene.transition as TransitionSpec | undefined,
        };
      }),
    );

    const result = await videoService.assembleProject({
      scenes,
      outputFormat: (input.outputFormat as "mp4" | "webm") ?? "mp4",
      width,
      height,
      fps: input.fps,
    });

    // Write the assembled video to a temp file
    const tempDir = await createTempDir();
    const outputPath = join(tempDir, `assembly_${input.projectId}.${result.format}`);
    await writeFile(outputPath, result.videoBuffer);

    return {
      videoUrl: outputPath,
      duration: result.duration,
      format: result.format,
      size: result.size,
    };
  }

  async isAvailable(): Promise<boolean> {
    return checkFFmpeg();
  }
}
