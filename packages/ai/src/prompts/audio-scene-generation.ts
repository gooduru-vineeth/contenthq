export function getAudioSceneGenerationPrompt(
  timestampedWords: { word: string; startMs: number; endMs: number }[],
  averageSceneDurationSec: number = 7,
  visualStyle?: string,
  imagePromptStyle?: string
): string {
  // Build a readable transcript with timestamps
  const transcriptLines: string[] = [];
  let currentLine = "";
  let lineStartMs = 0;

  for (const w of timestampedWords) {
    if (!currentLine) {
      lineStartMs = w.startMs;
    }
    currentLine += w.word + " ";

    // Break lines at ~10 words for readability
    if (currentLine.split(" ").length >= 10) {
      transcriptLines.push(
        `[${formatMs(lineStartMs)}-${formatMs(w.endMs)}] ${currentLine.trim()}`
      );
      currentLine = "";
    }
  }
  if (currentLine.trim()) {
    const lastWord = timestampedWords[timestampedWords.length - 1];
    transcriptLines.push(
      `[${formatMs(lineStartMs)}-${formatMs(lastWord?.endMs ?? 0)}] ${currentLine.trim()}`
    );
  }

  const totalDurationSec = timestampedWords.length > 0
    ? timestampedWords[timestampedWords.length - 1].endMs / 1000
    : 0;
  const suggestedSceneCount = Math.max(3, Math.round(totalDurationSec / averageSceneDurationSec));

  const styleInstruction = visualStyle
    ? `Visual style: ${visualStyle}`
    : "Visual style: photorealistic, cinematic";
  const promptStyleInstruction = imagePromptStyle
    ? `Image prompt style: ${imagePromptStyle}`
    : "";

  return `You are a video scene director. Split the following timestamped narration into visual scenes for video production.

TIMESTAMPED TRANSCRIPT:
${transcriptLines.join("\n")}

TOTAL DURATION: ${totalDurationSec.toFixed(1)} seconds
SUGGESTED SCENE COUNT: ~${suggestedSceneCount} scenes (aim for ${averageSceneDurationSec}s average per scene)
${styleInstruction}
${promptStyleInstruction}

RULES FOR SCENE BOUNDARIES:
1. Scene boundaries MUST align with word timestamps from the transcript
2. Each scene's startMs and endMs must correspond to actual word start/end times
3. Place scene breaks at natural pauses: sentence endings, topic shifts, or dramatic beats
4. Minimum scene duration: 3 seconds
5. Maximum scene duration: 15 seconds
6. Every word in the transcript must belong to exactly one scene (no gaps, no overlaps)

For each scene, provide:
1. index: Scene number (starting at 0)
2. startMs: Start time in milliseconds (must match a word's startMs)
3. endMs: End time in milliseconds (must match a word's endMs)
4. visualDescription: Detailed description of what appears on screen
5. imagePrompt: Optimized prompt for AI image generation (include art style, lighting, mood, composition; keep under 300 chars; no text/watermarks)
6. motionSpec: Camera movement {type, speed} — choose from: zoom_in, zoom_out, pan_left, pan_right, pan_up, pan_down, kenburns_in, kenburns_out, static. Speed: 0.1-1.0
7. transition: How this scene transitions to next (fade, fadeblack, dissolve, wipeleft, slideleft, circleopen, none for last scene)

Make each scene visually distinct. Vary motion types and transitions across scenes.`;
}

function formatMs(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = (totalSec % 60).toFixed(1);
  return min > 0 ? `${min}:${sec.padStart(4, "0")}` : `${sec}s`;
}

export function getAudioSceneOutputSchema() {
  return {
    scenes: [
      {
        index: 0,
        startMs: 0,
        endMs: 7000,
        visualDescription: "What the viewer sees",
        imagePrompt: "Cinematic wide shot, dramatic lighting, photorealistic, 4K",
        motionSpec: { type: "kenburns_in", speed: 0.5 },
        transition: "fade",
      },
    ],
  };
}
