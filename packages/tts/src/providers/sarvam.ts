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

/**
 * BCP-47 language code mapping for backward compatibility.
 * Maps short codes (e.g. "hi") to Sarvam's required BCP-47 codes (e.g. "hi-IN").
 */
const LANGUAGE_CODE_MAP: Record<string, string> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  od: 'od-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  en: 'en-IN',
  gu: 'gu-IN',
};

/**
 * Maps common format names to Sarvam's output_audio_codec values.
 */
function toSarvamCodec(format?: AudioFormat): string {
  if (!format) return 'mp3';
  switch (format) {
    case 'pcm': return 'linear16';
    case 'wav': return 'wav';
    case 'opus': return 'opus';
    case 'flac': return 'flac';
    case 'aac': return 'aac';
    default: return 'mp3';
  }
}

/**
 * Bulbul v3 speaker catalog — 39 speakers across 11 Indian languages.
 */
const BULBUL_V3_SPEAKERS: Voice[] = [
  // Hindi
  { id: 'meera', name: 'Meera', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'hindi'] },
  { id: 'pavithra', name: 'Pavithra', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'hindi'] },
  { id: 'maitreyi', name: 'Maitreyi', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'hindi'] },
  { id: 'arvind', name: 'Arvind', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'hindi'] },
  { id: 'arjun', name: 'Arjun', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'hindi'] },
  { id: 'shubh', name: 'Shubh', provider: 'sarvam', language: 'Hindi', languageCode: 'hi-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'hindi'] },

  // Bengali
  { id: 'neel', name: 'Neel', provider: 'sarvam', language: 'Bengali', languageCode: 'bn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'bengali'] },
  { id: 'amartya', name: 'Amartya', provider: 'sarvam', language: 'Bengali', languageCode: 'bn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'bengali'] },
  { id: 'diya', name: 'Diya', provider: 'sarvam', language: 'Bengali', languageCode: 'bn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'bengali'] },

  // Kannada
  { id: 'amrutha', name: 'Amrutha', provider: 'sarvam', language: 'Kannada', languageCode: 'kn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'kannada'] },
  { id: 'venkatesh', name: 'Venkatesh', provider: 'sarvam', language: 'Kannada', languageCode: 'kn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'kannada'] },
  { id: 'masala_chai', name: 'Masala Chai', provider: 'sarvam', language: 'Kannada', languageCode: 'kn-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'kannada'] },

  // Malayalam
  { id: 'theertha', name: 'Theertha', provider: 'sarvam', language: 'Malayalam', languageCode: 'ml-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'malayalam'] },
  { id: 'maya', name: 'Maya', provider: 'sarvam', language: 'Malayalam', languageCode: 'ml-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'malayalam'] },
  { id: 'surya', name: 'Surya', provider: 'sarvam', language: 'Malayalam', languageCode: 'ml-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'malayalam'] },

  // Marathi
  { id: 'devika', name: 'Devika', provider: 'sarvam', language: 'Marathi', languageCode: 'mr-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'marathi'] },
  { id: 'kalpana', name: 'Kalpana', provider: 'sarvam', language: 'Marathi', languageCode: 'mr-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'marathi'] },
  { id: 'samar', name: 'Samar', provider: 'sarvam', language: 'Marathi', languageCode: 'mr-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'marathi'] },

  // Odia
  { id: 'ananya', name: 'Ananya', provider: 'sarvam', language: 'Odia', languageCode: 'od-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'odia'] },
  { id: 'umesh', name: 'Umesh', provider: 'sarvam', language: 'Odia', languageCode: 'od-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'odia'] },

  // Punjabi
  { id: 'gurpreet', name: 'Gurpreet', provider: 'sarvam', language: 'Punjabi', languageCode: 'pa-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'punjabi'] },
  { id: 'simran', name: 'Simran', provider: 'sarvam', language: 'Punjabi', languageCode: 'pa-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'punjabi'] },

  // Tamil
  { id: 'revathi', name: 'Revathi', provider: 'sarvam', language: 'Tamil', languageCode: 'ta-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'tamil'] },
  { id: 'sri', name: 'Sri', provider: 'sarvam', language: 'Tamil', languageCode: 'ta-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'tamil'] },
  { id: 'tamizh', name: 'Tamizh', provider: 'sarvam', language: 'Tamil', languageCode: 'ta-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'tamil'] },
  { id: 'filter_coffee', name: 'Filter Coffee', provider: 'sarvam', language: 'Tamil', languageCode: 'ta-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'tamil'] },

  // Telugu
  { id: 'lakshmi', name: 'Lakshmi', provider: 'sarvam', language: 'Telugu', languageCode: 'te-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'telugu'] },
  { id: 'vishnu', name: 'Vishnu', provider: 'sarvam', language: 'Telugu', languageCode: 'te-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'telugu'] },
  { id: 'hyderabadi_biryani', name: 'Hyderabadi Biryani', provider: 'sarvam', language: 'Telugu', languageCode: 'te-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'telugu'] },

  // English (Indian)
  { id: 'advika', name: 'Advika', provider: 'sarvam', language: 'English (Indian)', languageCode: 'en-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'english'] },
  { id: 'raman', name: 'Raman', provider: 'sarvam', language: 'English (Indian)', languageCode: 'en-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'english'] },
  { id: 'vidya', name: 'Vidya', provider: 'sarvam', language: 'English (Indian)', languageCode: 'en-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'english'] },
  { id: 'arjun_english', name: 'Arjun (English)', provider: 'sarvam', language: 'English (Indian)', languageCode: 'en-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'english'] },

  // Gujarati
  { id: 'namrata', name: 'Namrata', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'gujarati'] },
  { id: 'hiral', name: 'Hiral', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'gujarati'] },
  { id: 'dhwani', name: 'Dhwani', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'gujarati'] },
  { id: 'keshav', name: 'Keshav', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'gujarati'] },
  { id: 'jhanvi', name: 'Jhanvi', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'female', tags: ['female', 'gujarati'] },
  { id: 'undhiyu', name: 'Undhiyu', provider: 'sarvam', language: 'Gujarati', languageCode: 'gu-IN', quality: 'standard', supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'], gender: 'male', tags: ['male', 'gujarati'] },
];

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

  /**
   * Resolve a language code to a Sarvam BCP-47 code.
   * Accepts both short codes ("hi") and full BCP-47 ("hi-IN").
   */
  private resolveLangCode(code?: string): string {
    if (!code) return 'hi-IN';
    // Already a BCP-47 code that Sarvam expects
    if (code.includes('-')) return code;
    return LANGUAGE_CODE_MAP[code] || 'hi-IN';
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const voiceId = options.voiceId || this.defaultVoiceId || 'shubh';
    const targetLang = this.resolveLangCode(options.languageCode);
    const codec = toSarvamCodec(options.format || this.defaultFormat);

    // Clamp pace to Bulbul v3 range: 0.5–2.0
    let pace = options.speed ?? 1.0;
    pace = Math.max(0.5, Math.min(2.0, pace));

    const body: Record<string, unknown> = {
      text: options.text,
      target_language_code: targetLang,
      model: 'bulbul:v3',
      speaker: voiceId,
      pace,
      output_audio_codec: codec,
    };

    if (options.sampleRate) {
      body.speech_sample_rate = options.sampleRate;
    }

    const url = `${this.baseUrl}/text-to-speech`;
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

    // Bulbul v3 returns JSON with base64-encoded audio in audios[] array
    const json = (await res.json()) as { audios: string[] };
    if (!json.audios || json.audios.length === 0) {
      throw new Error('Sarvam TTS returned empty audios array');
    }
    const buffer = Buffer.from(json.audios[0], 'base64');

    const secs = Math.round((options.text.split(/\s+/).length / 150) * 60);
    return {
      provider: 'sarvam',
      voiceId,
      audioBuffer: buffer,
      format: options.format || this.defaultFormat,
      sampleRate: options.sampleRate || 22050,
      duration: secs,
      characterCount: options.text.length,
      estimatedCost: 0,
      metadata: { characterCount: options.text.length, generatedAt: new Date(), model: 'bulbul:v3' },
    };
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async getVoices(): Promise<Voice[]> {
    return BULBUL_V3_SPEAKERS;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample preview.';
    return this.generateAudio({ text, voiceId: options.voiceId, format: options.format || 'mp3' });
  }
}
