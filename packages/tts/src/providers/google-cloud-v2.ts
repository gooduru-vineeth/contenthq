import { TextToSpeechClient } from '@google-cloud/text-to-speech';

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

// Helper: wrap raw LINEAR16 PCM into a proper WAV container
function wrapLinear16ToWav(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  const bitsPerSample = 16;
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM data
  pcm.copy(buffer, 44);
  return buffer;
}

export interface GoogleCloudTTSV2Config {
  provider: Extract<SpeechProvider, 'google'>;
  enabled: boolean;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  defaultVoiceId?: string;
  serviceAccountPath?: string;
  credentials?: any;
  enableCaching?: boolean;
  cacheTTL?: number;
  maxConcurrentRequests?: number;
}

type AudioEncoding = 'MP3' | 'OGG_OPUS' | 'LINEAR16' | 'FLAC';

function mapFormatToEncoding(format?: AudioFormat): AudioEncoding {
  switch (format) {
    case 'mp3':
    default:
      return 'MP3';
    case 'opus':
      return 'OGG_OPUS';
    case 'wav':
    case 'pcm':
      return 'LINEAR16';
    case 'flac':
      return 'FLAC';
    case 'aac':
      return 'MP3';
  }
}

function inferLanguageCode(voiceId?: string): string | undefined {
  if (!voiceId) return undefined;
  const parts = voiceId.split('-');
  if (parts.length >= 2) {
    return `${parts[0]}-${parts[1]}`;
  }
  return undefined;
}

function estimateDurationSeconds(text: string, speakingRate = 1): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 150 / speakingRate;
  return minutes * 60;
}

function getCostPerCharacterForVoice(voiceId?: string): number {
  if (!voiceId) return 0.000016;
  const id = voiceId.toLowerCase();
  if (id.includes('neural2')) return 0.000016;
  if (id.includes('wavenet')) return 0.000004;
  if (id.includes('standard')) return 0.000004;
  if (id.includes('journey') || id.includes('hd')) return 0.00003;
  return 0.000016;
}

export class GoogleCloudTTSProviderV2 implements ITTSProvider {
  readonly provider: Extract<SpeechProvider, 'google'> = 'google';
  readonly capabilities: TTSProviderCapabilities = {
    provider: 'google',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['mp3', 'opus', 'wav', 'pcm', 'flac'],
    supportedLanguages: [],
    supportsSSML: true,
    supportsVoiceCloning: false,
    supportsEmotions: false,
    supportsSpeechMarks: true,
    costPerCharacter: 0.000016,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 24000,
    availableQualities: ['standard', 'premium'],
    models: [
      {
        modelId: 'chirp-3-hd',
        name: 'Chirp 3 HD voices',
        supportsEmotionTags: false,
        description: 'Latest HD voices (e.g., Journey). High realism.',
      },
      {
        modelId: 'neural2',
        name: 'Neural2 voices',
        supportsEmotionTags: false,
        description: 'High-naturalness voices with broad language support.',
      },
      {
        modelId: 'wavenet',
        name: 'WaveNet voices',
        supportsEmotionTags: false,
        description: 'Legacy high-quality voices at lower cost.',
      },
      {
        modelId: 'standard',
        name: 'Standard voices',
        supportsEmotionTags: false,
        description: 'Legacy voices optimized for price.',
      },
    ],
  };

  private client: TextToSpeechClient;
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat;

  constructor(private config: GoogleCloudTTSV2Config) {
    const clientOptions: any = {};
    if (config.credentials) {
      clientOptions.credentials = config.credentials;
    } else if (config.serviceAccountPath) {
      clientOptions.keyFilename = config.serviceAccountPath;
    }
    this.client = new TextToSpeechClient(clientOptions);
    this.defaultVoiceId = config.defaultVoiceId;
    this.defaultFormat = config.defaultFormat || 'wav';
  }

  getCacheStats(): { hits: number; misses: number; size: number; ttl: number } {
    return { hits: 0, misses: 0, size: 0, ttl: this.config.cacheTTL || 0 };
  }

  async checkAvailability(): Promise<boolean> {
    try {
      await this.client.getProjectId();
      await this.client.listVoices({ languageCode: 'en-US' });
      return true;
    } catch {
      return false;
    }
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    const ratePerCharacter = getCostPerCharacterForVoice(params.voiceId || this.defaultVoiceId);
    const characterCount = params.textLength;
    const estimatedCost = characterCount * ratePerCharacter;
    return {
      provider: 'google',
      characterCount,
      estimatedCost,
      ratePerCharacter,
    };
  }

  private toAudioConfig(format?: AudioFormat, sampleRate?: number, speed?: number, pitch?: number) {
    const encoding = mapFormatToEncoding(format || this.defaultFormat);
    const audioConfig: any = { audioEncoding: encoding };
    if (sampleRate) {
      audioConfig.sampleRateHertz = sampleRate;
    } else if (encoding === 'LINEAR16') {
      audioConfig.sampleRateHertz = this.capabilities.defaultSampleRate;
    }
    if (speed) audioConfig.speakingRate = speed;
    if (typeof pitch === 'number') audioConfig.pitch = pitch;
    return audioConfig;
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const voiceId = options.voiceId || this.defaultVoiceId || 'en-US-Neural2-D';
    const languageCode = options.languageCode || inferLanguageCode(voiceId) || 'en-US';
    const audioConfig = this.toAudioConfig(
      options.format,
      options.sampleRate,
      options.speed,
      options.pitch,
    );

    const [response] = await this.client.synthesizeSpeech({
      input: { text: options.text },
      voice: { name: voiceId, languageCode },
      audioConfig,
    } as any);

    if (!response.audioContent) {
      throw new Error('Google Cloud TTS returned no audio content');
    }

    let rawBuffer: Buffer;
    const content: any = response.audioContent as any;
    if (typeof content === 'string') {
      rawBuffer = Buffer.from(content, 'base64');
    } else if (content instanceof Uint8Array) {
      rawBuffer = Buffer.from(content);
    } else {
      rawBuffer = Buffer.from(content as Buffer);
    }

    const requestedFormat = options.format || this.defaultFormat;
    const usedSampleRate = audioConfig.sampleRateHertz || this.capabilities.defaultSampleRate;
    const audioBuffer =
      requestedFormat === 'wav' ? wrapLinear16ToWav(rawBuffer, usedSampleRate, 1) : rawBuffer;

    const durationSeconds = estimateDurationSeconds(options.text, options.speed || 1);
    const characterCount = options.text.length;
    const ratePerCharacter = getCostPerCharacterForVoice(voiceId);
    const estimatedCost = characterCount * ratePerCharacter;

    return {
      provider: 'google',
      voiceId,
      audioBuffer,
      format: requestedFormat,
      sampleRate: usedSampleRate,
      duration: durationSeconds,
      characterCount,
      estimatedCost,
      metadata: {
        characterCount,
        generatedAt: new Date(),
        model: voiceId.includes('Neural2')
          ? 'Neural2'
          : voiceId.includes('Wavenet')
            ? 'WaveNet'
            : voiceId.toLowerCase().includes('journey')
              ? 'Chirp 3 HD'
              : 'Google TTS',
      },
    };
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages.length
      ? this.capabilities.supportedLanguages
      : ['en-US'];
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    const [result] = await this.client.listVoices(languageCode ? { languageCode } : {});
    const voices: Voice[] = [];

    for (const v of result.voices || []) {
      const id = v.name || 'unknown';
      const lang = (v.languageCodes && v.languageCodes[0]) || 'en-US';
      const genderMap: Record<string, 'male' | 'female' | 'neutral'> = {
        SSML_VOICE_GENDER_MALE: 'male',
        SSML_VOICE_GENDER_FEMALE: 'female',
        SSML_VOICE_GENDER_NEUTRAL: 'neutral',
        SSML_VOICE_GENDER_UNSPECIFIED: 'neutral',
      };
      const gender = genderMap[String(v.ssmlGender)] || 'neutral';

      const lower = id.toLowerCase();
      const tags: string[] = [];
      let quality: VoiceQuality = 'standard';
      if (lower.includes('neural2')) {
        quality = 'premium';
        tags.push('neural2');
      } else if (lower.includes('wavenet')) {
        quality = 'premium';
        tags.push('wavenet');
      } else if (lower.includes('journey') || lower.includes('hd')) {
        quality = 'premium';
        tags.push('chirp3_hd');
      } else if (lower.includes('standard')) {
        quality = 'standard';
        tags.push('standard');
      }

      voices.push({
        id,
        name: id,
        language: lang.split('-')[0],
        languageCode: lang,
        gender,
        provider: 'google',
        quality,
        supportedFormats: this.capabilities.supportedFormats,
        tags,
      });
    }

    const langs = new Set(this.capabilities.supportedLanguages);
    (result.voices || []).forEach((v) => (v.languageCodes || []).forEach((lc) => langs.add(lc)));
    this.capabilities.supportedLanguages = Array.from(langs);

    return voices;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample voice preview.';
    return this.generateAudio({
      text,
      voiceId: options.voiceId,
      format: options.format || this.defaultFormat,
    });
  }
}
