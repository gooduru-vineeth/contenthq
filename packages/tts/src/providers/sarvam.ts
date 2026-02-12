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

export interface SarvamConfig {
  provider: Extract<SpeechProvider, 'sarvam'>;
  enabled: boolean;
  apiKey: string;
  defaultVoiceId?: string;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  baseUrl?: string;
}

export class SarvamTTSProvider implements ITTSProvider {
  readonly provider: Extract<SpeechProvider, 'sarvam'> = 'sarvam';
  readonly capabilities: TTSProviderCapabilities = TTS_PROVIDER_CAPABILITIES['sarvam'];

  private apiKey: string;
  private baseUrl: string;
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat = 'mp3';

  constructor(config: SarvamConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.sarvam.ai';
    this.defaultVoiceId = config.defaultVoiceId;
    if (config.defaultFormat) this.defaultFormat = config.defaultFormat;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      return !!this.apiKey;
    } catch {
      return false;
    }
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    return {
      provider: 'sarvam',
      characterCount: params.textLength,
      estimatedCost: 0,
      ratePerCharacter: 0,
    };
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const voiceId = options.voiceId || this.defaultVoiceId || 'meera';
    const url = `${this.baseUrl}/text-to-speech`;
    const body = {
      input: options.text,
      voice: voiceId,
      language: options.languageCode || 'hi',
      output_format: 'mp3',
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'api-subscription-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    } as any);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Sarvam TTS failed: ${res.status} - ${txt}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const secs = Math.round((options.text.split(/\s+/).length / 150) * 60);
    return {
      provider: 'sarvam',
      voiceId,
      audioBuffer: buffer,
      format: 'mp3',
      sampleRate: 24000,
      duration: secs,
      characterCount: options.text.length,
      estimatedCost: 0,
      metadata: { characterCount: options.text.length, generatedAt: new Date(), model: 'sarvam-bulbul' },
    };
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async getVoices(): Promise<Voice[]> {
    const voices: Voice[] = [
      { id: 'meera', name: 'Meera', provider: 'sarvam', language: 'hi', languageCode: 'hi', quality: 'standard', supportedFormats: ['mp3'], tags: ['female'] },
      { id: 'arjun', name: 'Arjun', provider: 'sarvam', language: 'hi', languageCode: 'hi', quality: 'standard', supportedFormats: ['mp3'], tags: ['male'] },
    ];
    return voices;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample preview.';
    return this.generateAudio({ text, voiceId: options.voiceId, format: options.format || 'mp3' });
  }
}
