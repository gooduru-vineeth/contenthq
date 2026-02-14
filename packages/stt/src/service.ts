import type { STTResult, STTOptions } from "./types";
import { transcribeWithGroqWhisper } from "./providers/groq-whisper";

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: STTOptions = {}
): Promise<STTResult> {
  const provider = options.provider || "groq";

  switch (provider) {
    case "groq":
      return transcribeWithGroqWhisper(audioBuffer, options);
    default:
      throw new Error(`Unsupported STT provider: ${provider}`);
  }
}
