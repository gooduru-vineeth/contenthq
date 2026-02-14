import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { MotionSpec, MotionType, TransitionSpec } from "./types";

const execAsync = promisify(exec);

function validateNumeric(value: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name}: must be a positive finite number`);
  }
  return value;
}

function validateDimensions(width: number, height: number): void {
  validateNumeric(width, 'width');
  validateNumeric(height, 'height');
  if (!Number.isInteger(width) || width < 1 || width > 7680) {
    throw new Error('Invalid width: must be an integer between 1 and 7680');
  }
  if (!Number.isInteger(height) || height < 1 || height > 4320) {
    throw new Error('Invalid height: must be an integer between 1 and 4320');
  }
}

function validateFps(fps: number): void {
  validateNumeric(fps, 'fps');
  if (fps < 1 || fps > 120) {
    throw new Error('Invalid fps: must be between 1 and 120');
  }
}

function validateDuration(duration: number): void {
  validateNumeric(duration, 'duration');
  if (duration < 0.1 || duration > 3600) {
    throw new Error('Invalid duration: must be between 0.1 and 3600');
  }
}

function validateVolume(volume: number, name: string): void {
  if (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0) {
    throw new Error(`Invalid ${name}: must be a non-negative finite number`);
  }
}

export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync("ffmpeg -version");
    return true;
  } catch {
    return false;
  }
}

export async function createTempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "contenthq-video-"));
}

/**
 * Get accurate audio duration using ffprobe
 * @param audioBuffer - Audio file buffer
 * @returns Duration in seconds with millisecond precision
 */
export async function getAudioDuration(audioBuffer: Buffer): Promise<number> {
  const tempDir = await createTempDir();
  const audioPath = join(tempDir, "temp-audio.mp3");

  try {
    await writeFile(audioPath, audioBuffer);

    // Use ffprobe to read container metadata
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    const { stdout } = await execAsync(cmd, { timeout: 10000 });

    const duration = parseFloat(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error(`Invalid duration from ffprobe: ${stdout}`);
    }

    return duration;
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function buildZoompanFilter(
  motionType: MotionType,
  speed: number,
  duration: number,
  fps: number,
  width: number,
  height: number,
): string {
  const d = Math.round(duration * fps);
  const maxDelta = 0.04 + speed * 0.16;
  const panPx = Math.round(width * 0.05 + width * speed * 0.15);
  const panPxH = Math.round(height * 0.05 + height * speed * 0.15);
  const w2 = width * 2;
  const h2 = height * 2;

  switch (motionType) {
    case "zoom_in":
      return `zoompan=z='1.0+${maxDelta}*on/${d}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "zoom_out":
      return `zoompan=z='(1.0+${maxDelta})-${maxDelta}*on/${d}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "pan_left":
      return `zoompan=z='1.1':x='${panPx}*(1-on/${d})':y='ih/2-(ih/zoom/2)':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "pan_right":
      return `zoompan=z='1.1':x='${panPx}*on/${d}':y='ih/2-(ih/zoom/2)':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "pan_up":
      return `zoompan=z='1.1':x='iw/2-(iw/zoom/2)':y='${panPxH}*(1-on/${d})':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "pan_down":
      return `zoompan=z='1.1':x='iw/2-(iw/zoom/2)':y='${panPxH}*on/${d}':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "kenburns_in":
      return `zoompan=z='1.0+${maxDelta}*on/${d}':x='iw/2-(iw/zoom/2)+${Math.round(panPx * 0.3)}*on/${d}':y='ih/2-(ih/zoom/2)+${Math.round(panPx * 0.2)}*on/${d}':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "kenburns_out":
      return `zoompan=z='(1.0+${maxDelta})-${maxDelta}*on/${d}':x='iw/2-(iw/zoom/2)-${Math.round(panPx * 0.3)}*on/${d}':y='ih/2-(ih/zoom/2)-${Math.round(panPx * 0.2)}*on/${d}':d=${d}:s=${w2}x${h2}:fps=${fps}`;
    case "static":
    default:
      return `zoompan=z='1.0':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${w2}x${h2}:fps=${fps}`;
  }
}

export async function imageToVideo(
  imageBuffer: Buffer,
  duration: number,
  width = 1920,
  height = 1080,
  fps = 30,
  motionSpec?: MotionSpec,
): Promise<Buffer> {
  validateDimensions(width, height);
  validateFps(fps);
  validateDuration(duration);

  const tempDir = await createTempDir();
  const inputPath = join(tempDir, "input.png");
  const outputPath = join(tempDir, "output.mp4");

  try {
    await writeFile(inputPath, imageBuffer);

    let cmd: string;

    if (motionSpec) {
      const speed = Math.max(0.1, Math.min(1.0, motionSpec.speed ?? 0.5));
      const zoompanFilter = buildZoompanFilter(motionSpec.type, speed, duration, fps, width, height);
      const w2 = width * 2;
      const h2 = height * 2;

      cmd = [
        "ffmpeg -y",
        `-loop 1 -i "${inputPath}"`,
        `-vf "scale=${w2}:${h2}:force_original_aspect_ratio=decrease,pad=${w2}:${h2}:(ow-iw)/2:(oh-ih)/2,${zoompanFilter},scale=${width}:${height}"`,
        `-c:v libx264 -t ${duration}`,
        `-pix_fmt yuv420p`,
        `-r ${fps}`,
        `"${outputPath}"`,
      ].join(" ");
    } else {
      cmd = [
        "ffmpeg -y",
        `-loop 1 -i "${inputPath}"`,
        `-c:v libx264 -t ${duration}`,
        `-pix_fmt yuv420p`,
        `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2"`,
        `-r ${fps}`,
        `"${outputPath}"`,
      ].join(" ");
    }

    await execAsync(cmd, { timeout: 120000 });
    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function mixAudio(
  voiceoverBuffer: Buffer,
  musicBuffer?: Buffer,
  voiceoverVolume = 100,
  musicVolume = 30,
): Promise<Buffer> {
  validateVolume(voiceoverVolume, 'voiceoverVolume');
  validateVolume(musicVolume, 'musicVolume');

  const tempDir = await createTempDir();
  const voicePath = join(tempDir, "voice.mp3");
  const outputPath = join(tempDir, "mixed.mp3");

  try {
    await writeFile(voicePath, voiceoverBuffer);

    if (musicBuffer) {
      const musicPath = join(tempDir, "music.mp3");
      await writeFile(musicPath, musicBuffer);

      const vVol = voiceoverVolume / 100;
      const mVol = musicVolume / 100;

      const cmd = [
        "ffmpeg -y",
        `-i "${voicePath}" -i "${musicPath}"`,
        `-filter_complex "[0:a]volume=${vVol}[v];[1:a]volume=${mVol},aloop=loop=-1:size=2e+09[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[out]"`,
        `-map "[out]"`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(cmd, { timeout: 120000 });
    } else {
      const vVol = voiceoverVolume / 100;
      const cmd = [
        "ffmpeg -y",
        `-i "${voicePath}"`,
        `-filter_complex "[0:a]volume=${vVol}[out]"`,
        `-map "[out]"`,
        `"${outputPath}"`,
      ].join(" ");
      await execAsync(cmd, { timeout: 60000 });
    }

    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function assembleVideo(
  sceneFiles: Array<{ videoPath: string; audioPath: string; duration: number; transition?: TransitionSpec }>,
  outputPath: string,
  width = 1920,
  height = 1080,
  defaultTransition?: TransitionSpec,
): Promise<Buffer> {
  validateDimensions(width, height);

  const tempDir = await createTempDir();
  const concatFile = join(tempDir, "concat.txt");

  try {
    // Merge each scene's video and audio
    const mergedScenes: string[] = [];

    for (let i = 0; i < sceneFiles.length; i++) {
      const scene = sceneFiles[i];
      const mergedPath = join(tempDir, `merged_${i}.mp4`);

      const cmd = [
        "ffmpeg -y",
        `-i "${scene.videoPath}" -i "${scene.audioPath}"`,
        `-c:v libx264 -c:a aac`,
        `-map 0:v:0 -map 1:a:0`,
        `-shortest`,
        `"${mergedPath}"`,
      ].join(" ");

      await execAsync(cmd, { timeout: 120000 });
      mergedScenes.push(mergedPath);
    }

    // Determine if any scene uses a non-"none" transition
    const resolvedTransitions: TransitionSpec[] = [];
    for (let i = 0; i < sceneFiles.length - 1; i++) {
      const t = sceneFiles[i + 1]?.transition ?? defaultTransition ?? { type: "none" as const };
      resolvedTransitions.push(t);
    }

    const hasTransitions = mergedScenes.length > 1 &&
      resolvedTransitions.some((t) => t.type !== "none");

    if (mergedScenes.length === 1) {
      // Single scene: just scale to output dimensions
      const cmd = [
        "ffmpeg -y",
        `-i "${mergedScenes[0]}"`,
        `-c:v libx264 -c:a aac`,
        `-vf "scale=${width}:${height}"`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(cmd, { timeout: 300000 });
    } else if (!hasTransitions) {
      // No transitions: use simple concat demuxer (fast, no re-encoding)
      const concatContent = mergedScenes.map((p) => `file '${p}'`).join("\n");
      await writeFile(concatFile, concatContent);

      const cmd = [
        "ffmpeg -y",
        `-f concat -safe 0 -i "${concatFile}"`,
        `-c:v libx264 -c:a aac`,
        `-vf "scale=${width}:${height}"`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(cmd, { timeout: 300000 });
    } else {
      // Transitions: build xfade + acrossfade filter_complex
      const inputs = mergedScenes.map((p) => `-i "${p}"`).join(" ");

      // Calculate capped transition durations
      const transDurations: number[] = [];
      for (let i = 0; i < resolvedTransitions.length; i++) {
        const t = resolvedTransitions[i];
        const rawDur = t.duration ?? 0.5;
        const maxDur = Math.min(
          sceneFiles[i].duration,
          sceneFiles[i + 1].duration,
        ) * 0.4;
        transDurations.push(t.type === "none" ? 0.01 : Math.min(rawDur, maxDur));
      }

      // Build video xfade chain
      const videoFilters: string[] = [];
      let cumulativeDuration = sceneFiles[0].duration;
      let lastVideoLabel = "[0:v]";

      for (let i = 0; i < resolvedTransitions.length; i++) {
        const t = resolvedTransitions[i];
        const td = transDurations[i];
        const xfadeType = t.type === "none" ? "fade" : t.type;
        const offset = Math.max(0, cumulativeDuration - td);
        const outLabel = i === resolvedTransitions.length - 1 ? "[vfinal]" : `[v${i}]`;

        videoFilters.push(
          `${lastVideoLabel}[${i + 1}:v]xfade=transition=${xfadeType}:duration=${td}:offset=${offset}${outLabel}`,
        );

        lastVideoLabel = outLabel;
        cumulativeDuration = offset + sceneFiles[i + 1].duration;
      }

      // Build audio acrossfade chain
      const audioFilters: string[] = [];
      let lastAudioLabel = "[0:a]";

      for (let i = 0; i < resolvedTransitions.length; i++) {
        const td = transDurations[i];
        const outLabel = i === resolvedTransitions.length - 1 ? "[afinal]" : `[a${i}]`;

        audioFilters.push(
          `${lastAudioLabel}[${i + 1}:a]acrossfade=d=${td}:c1=tri:c2=tri${outLabel}`,
        );

        lastAudioLabel = outLabel;
      }

      // Final scale filter
      const scaleFilter = `[vfinal]scale=${width}:${height}[vout]`;

      const filterComplex = [...videoFilters, ...audioFilters, scaleFilter].join(";\n");

      const cmd = [
        "ffmpeg -y",
        inputs,
        `-filter_complex "${filterComplex}"`,
        `-map "[vout]" -map "[afinal]"`,
        `-c:v libx264 -c:a aac`,
        `-pix_fmt yuv420p`,
        `"${outputPath}"`,
      ].join(" ");

      await execAsync(cmd, { timeout: 600000 });
    }

    return readFile(outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function _cleanup(...paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) => unlink(p).catch(() => {})),
  );
}
