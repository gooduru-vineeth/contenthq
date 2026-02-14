import type { TTSOptions, TTSResult, TTSProvider, TTSVoice } from "./types";
import { generateOpenAITTS, OPENAI_VOICES } from "./providers/openai-tts";
import { generateElevenLabsTTS, ELEVENLABS_VOICES } from "./providers/elevenlabs-tts";
import { InworldTTSProvider, DEFAULT_INWORLD_VOICE_ID } from "./providers/inworld";
import { SarvamTTSProvider } from "./providers/sarvam";
import { GoogleGeminiTTSProvider } from "./providers/google-gemini-tts";

async function generateInworldTTS(options: TTSOptions): Promise<TTSResult> {
  const provider = new InworldTTSProvider({
    provider: "inworld",
    enabled: true,
    workspaceId: process.env.INWORLD_WORKSPACE_ID ?? "",
    apiKey: process.env.INWORLD_API_KEY ?? "",
    model: (process.env.INWORLD_TTS_MODEL as any) || 'inworld-tts-1.5-max',
    baseUrl: process.env.INWORLD_API_BASE_URL,
  });
  const result = await provider.generateAudio({ text: options.text, voiceId: options.voiceId, speed: options.speed });
  return { audioBuffer: result.audioBuffer, duration: result.duration, provider: "inworld", voiceId: result.voiceId, format: result.format };
}

async function generateSarvamTTS(options: TTSOptions): Promise<TTSResult> {
  const provider = new SarvamTTSProvider({
    provider: "sarvam",
    enabled: true,
    apiKey: process.env.SARVAM_API_KEY ?? "",
  });
  const result = await provider.generateAudio({ text: options.text, voiceId: options.voiceId, speed: options.speed, languageCode: options.language });
  return { audioBuffer: result.audioBuffer, duration: result.duration, provider: "sarvam", voiceId: result.voiceId, format: result.format };
}

async function generateGoogleGeminiTTS(options: TTSOptions): Promise<TTSResult> {
  const provider = new GoogleGeminiTTSProvider({
    provider: "google-gemini",
    enabled: true,
  });
  const result = await provider.generateAudio({ text: options.text, voiceId: options.voiceId, speed: options.speed });
  return { audioBuffer: result.audioBuffer, duration: result.duration, provider: "google-gemini", voiceId: result.voiceId, format: result.format };
}

const providerMap: Record<TTSProvider, (options: TTSOptions) => Promise<TTSResult>> = {
  openai: generateOpenAITTS,
  elevenlabs: generateElevenLabsTTS,
  google: generateOpenAITTS, // fallback to OpenAI for now
  "google-gemini": generateGoogleGeminiTTS,
  inworld: generateInworldTTS,
  sarvam: generateSarvamTTS,
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
    case "google-gemini":
      return "Kore";
    case "inworld":
      return DEFAULT_INWORLD_VOICE_ID;
    case "sarvam":
      return "shubh";
    default:
      return "alloy";
  }
}
