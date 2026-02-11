import { exec } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execAsync = promisify(exec);

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

export async function imageToVideo(
  imageBuffer: Buffer,
  duration: number,
  width = 1920,
  height = 1080,
  fps = 30,
): Promise<Buffer> {
  const tempDir = await createTempDir();
  const inputPath = join(tempDir, "input.png");
  const outputPath = join(tempDir, "output.mp4");

  try {
    await writeFile(inputPath, imageBuffer);

    const cmd = [
      "ffmpeg -y",
      `-loop 1 -i "${inputPath}"`,
      `-c:v libx264 -t ${duration}`,
      `-pix_fmt yuv420p`,
      `-vf "scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2"`,
      `-r ${fps}`,
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(cmd, { timeout: 120000 });
    return readFile(outputPath);
  } finally {
    await cleanup(inputPath, outputPath);
  }
}

export async function mixAudio(
  voiceoverBuffer: Buffer,
  musicBuffer?: Buffer,
  voiceoverVolume = 100,
  musicVolume = 30,
): Promise<Buffer> {
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
      await unlink(musicPath);
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
    await cleanup(voicePath, outputPath);
  }
}

export async function assembleVideo(
  sceneFiles: Array<{ videoPath: string; audioPath: string; duration: number }>,
  outputPath: string,
  width = 1920,
  height = 1080,
): Promise<Buffer> {
  const tempDir = await createTempDir();
  const concatFile = join(tempDir, "concat.txt");

  try {
    // Create concat file for video segments
    const mergedScenes: string[] = [];

    for (let i = 0; i < sceneFiles.length; i++) {
      const scene = sceneFiles[i];
      const mergedPath = join(tempDir, `merged_${i}.mp4`);

      // Merge each scene's video and audio
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

    // Write concat list
    const concatContent = mergedScenes.map((p) => `file '${p}'`).join("\n");
    await writeFile(concatFile, concatContent);

    // Concatenate all scenes
    const cmd = [
      "ffmpeg -y",
      `-f concat -safe 0 -i "${concatFile}"`,
      `-c:v libx264 -c:a aac`,
      `-vf "scale=${width}:${height}"`,
      `"${outputPath}"`,
    ].join(" ");

    await execAsync(cmd, { timeout: 300000 });
    return readFile(outputPath);
  } finally {
    await unlink(concatFile).catch(() => {});
  }
}

async function cleanup(...paths: string[]): Promise<void> {
  await Promise.all(
    paths.map((p) => unlink(p).catch(() => {})),
  );
}
