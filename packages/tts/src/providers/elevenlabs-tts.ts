import type { TTSOptions, TTSResult, TTSVoice } from "../types";
import type {
  AudioFormat,
  AudioGenerationResult,
  CostEstimate,
  CostEstimateParams,
  GenerateAudioOptions,
  ITTSProvider,
  PreviewVoiceOptions,
  SpeechProvider,
  TTSProviderCapabilities,
  Voice,
  VoiceQuality,
} from '../provider-service';
import { TTS_PROVIDER_CAPABILITIES } from '../provider-service';

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
      signal: AbortSignal.timeout(60000),
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

// ============================================================================
// ElevenLabs TTS Provider (ITTSProvider implementation)
// ============================================================================

export interface ElevenLabsProviderConfig {
  provider: Extract<SpeechProvider, 'elevenlabs'>;
  enabled: boolean;
  apiKey: string;
  defaultVoiceId?: string;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  baseUrl?: string;
}

export class ElevenLabsTTSProvider implements ITTSProvider {
  readonly provider: Extract<SpeechProvider, 'elevenlabs'> = 'elevenlabs';
  readonly capabilities: TTSProviderCapabilities = TTS_PROVIDER_CAPABILITIES['elevenlabs'];

  private apiKey: string;
  private baseUrl: string;
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat = 'wav';

  constructor(config: ElevenLabsProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.elevenlabs.io';
    this.defaultVoiceId = config.defaultVoiceId;
    if (config.defaultFormat) this.defaultFormat = config.defaultFormat;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/v1/voices`, { headers: { 'xi-api-key': this.apiKey } } as any);
      return res.ok;
    } catch {
      return false;
    }
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    return {
      provider: 'elevenlabs',
      characterCount: params.textLength,
      estimatedCost: 0,
      ratePerCharacter: 0,
    };
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const voiceId = options.voiceId || this.defaultVoiceId || 'EXAVITQu4vr4xnSDxMaL';
    const outputFormat = 'wav';
    const url = `${this.baseUrl}/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`;
    const body = {
      text: options.text,
      model_id: 'eleven_v3',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0,
        use_speaker_boost: true,
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    } as any);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`ElevenLabs TTS failed: ${res.status} - ${txt}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const secs = Math.round((options.text.split(/\s+/).length / 150) * 60);
    return {
      provider: 'elevenlabs',
      voiceId,
      audioBuffer: buffer,
      format: 'wav',
      sampleRate: 44100,
      duration: secs,
      characterCount: options.text.length,
      estimatedCost: 0,
      metadata: { characterCount: options.text.length, generatedAt: new Date(), model: 'eleven_v3' },
    };
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async getVoices(): Promise<Voice[]> {
    const res = await fetch(`${this.baseUrl}/v1/voices`, { headers: { 'xi-api-key': this.apiKey } } as any);
    if (!res.ok) return [];
    const json: any = await res.json();
    const voices: Voice[] = (json.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      provider: 'elevenlabs' as const,
      language: 'en',
      languageCode: 'en',
      quality: 'premium' as const,
      supportedFormats: ['mp3', 'wav'] as AudioFormat[],
      tags: ['cloning', 'emotions'],
    }));
    return voices;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample ElevenLabs preview.';
    return this.generateAudio({ text, voiceId: options.voiceId, format: options.format || 'mp3' });
  }
}
