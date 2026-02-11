import type { TTSOptions, TTSResult, TTSProvider, TTSVoice } from "./types";
import { generateOpenAITTS, OPENAI_VOICES } from "./providers/openai-tts";
import { generateElevenLabsTTS, ELEVENLABS_VOICES } from "./providers/elevenlabs-tts";

const providerMap: Record<TTSProvider, (options: TTSOptions) => Promise<TTSResult>> = {
  openai: generateOpenAITTS,
  elevenlabs: generateElevenLabsTTS,
  google: generateOpenAITTS, // fallback to OpenAI for now
};

export async function generateSpeech(options: TTSOptions): Promise<TTSResult> {
  const generator = providerMap[options.provider];
  if (!generator) {
    throw new Error(`Unsupported TTS provider: ${options.provider}`);
  }
  return generator(options);
}

export function getVoices(provider: TTSProvider): TTSVoice[] {
  switch (provider) {
    case "openai":
      return OPENAI_VOICES;
    case "elevenlabs":
      return ELEVENLABS_VOICES;
    case "google":
      return OPENAI_VOICES; // fallback
    default:
      return [];
  }
}

export function getDefaultVoice(provider: TTSProvider): string {
  switch (provider) {
    case "openai":
      return "alloy";
    case "elevenlabs":
      return "21m00Tcm4TlvDq8ikWAM";
    case "google":
      return "alloy";
    default:
      return "alloy";
  }
}
