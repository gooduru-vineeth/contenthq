import type { TTSOptions, TTSResult, TTSVoice } from "../types";

export const ELEVENLABS_VOICES: TTSVoice[] = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", language: "en", gender: "female" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", language: "en", gender: "female" },
  { id: "ErXwobaYiN019PkySvjV", name: "Antoni", language: "en", gender: "male" },
  { id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", language: "en", gender: "female" },
  { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", language: "en", gender: "male" },
];

export async function generateElevenLabsTTS(options: TTSOptions): Promise<TTSResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is required for ElevenLabs TTS");

  const voiceId = options.voiceId || "21m00Tcm4TlvDq8ikWAM";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: options.text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const wordCount = options.text.split(/\s+/).length;
  const estimatedDuration = Math.ceil((wordCount / 150) * 60);

  return {
    audioBuffer: buffer,
    duration: estimatedDuration,
    provider: "elevenlabs",
    voiceId,
    format: "mp3",
  };
}
