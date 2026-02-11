export interface TTSOptions {
  text: string;
  voiceId: string;
  provider: TTSProvider;
  speed?: number;
  pitch?: number;
  language?: string;
}

export interface TTSResult {
  audioBuffer: Buffer;
  duration: number;
  provider: string;
  voiceId: string;
  format: string;
}

export type TTSProvider = "openai" | "elevenlabs" | "google";

export interface TTSProviderConfig {
  name: TTSProvider;
  apiKey: string;
  defaultVoice: string;
  voices: TTSVoice[];
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female" | "neutral";
  preview?: string;
}
