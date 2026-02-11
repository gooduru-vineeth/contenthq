import type { TTSOptions, TTSResult, TTSVoice } from "../types";

export const OPENAI_VOICES: TTSVoice[] = [
  { id: "alloy", name: "Alloy", language: "en", gender: "neutral" },
  { id: "echo", name: "Echo", language: "en", gender: "male" },
  { id: "fable", name: "Fable", language: "en", gender: "female" },
  { id: "onyx", name: "Onyx", language: "en", gender: "male" },
  { id: "nova", name: "Nova", language: "en", gender: "female" },
  { id: "shimmer", name: "Shimmer", language: "en", gender: "female" },
];

export async function generateOpenAITTS(options: TTSOptions): Promise<TTSResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for TTS");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: options.text,
      voice: options.voiceId || "alloy",
      speed: options.speed ?? 1.0,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS failed: ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // Estimate duration: ~150 words per minute, average word = 5 chars
  const wordCount = options.text.split(/\s+/).length;
  const estimatedDuration = Math.ceil((wordCount / 150) * 60);

  return {
    audioBuffer: buffer,
    duration: estimatedDuration,
    provider: "openai",
    voiceId: options.voiceId || "alloy",
    format: "mp3",
  };
}
