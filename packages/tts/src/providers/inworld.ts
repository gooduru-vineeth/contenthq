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

/** Default Inworld voice ID. Update by running: npx tsx scripts/fetch-inworld-voices.ts */
export const DEFAULT_INWORLD_VOICE_ID = 'Ashley';

export interface InworldTTSConfig {
  provider: Extract<SpeechProvider, 'inworld'>;
  enabled: boolean;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  defaultVoiceId?: string;
  baseUrl?: string;
  workspaceId: string;
  apiKey: string;
  model?: 'inworld-tts-1' | 'inworld-tts-1-max' | 'inworld-tts-1.5-mini' | 'inworld-tts-1.5-max';
}

function estimateDurationSeconds(text: string, speakingRate = 1): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = words / 150 / speakingRate;
  return minutes * 60;
}

export interface InworldVoiceCloneRequest {
  displayName: string;
  langCode: string;
  voiceSamples: Array<{ audioData: string }>;
  description?: string;
  tags?: string[];
  audioProcessingConfig?: {
    removeBackgroundNoise?: boolean;
  };
}

export interface InworldVoiceCloneResponse {
  voice: {
    voiceId: string;
    name: string;
    displayName: string;
    description?: string;
    languages: string[];
    tags?: string[];
  };
  audioSamplesValidated: Array<{
    langCode: string;
    warnings: string[];
    errors: string[];
    transcription: string;
  }>;
}

export class InworldTTSProvider implements ITTSProvider {
  readonly provider: Extract<SpeechProvider, 'inworld'> = 'inworld';
  readonly capabilities: TTSProviderCapabilities = {
    provider: 'inworld',
    maxCharactersPerRequest: 2000,
    supportedFormats: ['wav', 'mp3', 'opus', 'flac'],
    supportedLanguages: ['en', 'es', 'fr', 'ko', 'nl', 'zh', 'de', 'it', 'ja', 'pl', 'pt', 'ru', 'ar', 'hi', 'he'],
    supportsSSML: false,
    supportsVoiceCloning: true,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0.00001,
    minSpeed: 0.5,
    maxSpeed: 1.5,
    defaultSampleRate: 48000,
    availableQualities: ['premium', 'ultra'],
    models: [
      { modelId: 'inworld-tts-1.5-max', name: 'Inworld TTS 1.5 Max', supportsEmotionTags: true },
      { modelId: 'inworld-tts-1.5-mini', name: 'Inworld TTS 1.5 Mini', supportsEmotionTags: true },
      { modelId: 'inworld-tts-1', name: 'Inworld TTS', supportsEmotionTags: true },
      { modelId: 'inworld-tts-1-max', name: 'Inworld TTS Max', supportsEmotionTags: true },
    ],
  };

  private baseUrl: string;
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat;
  private workspaceId: string;
  private apiKey: string;
  private model: 'inworld-tts-1' | 'inworld-tts-1-max' | 'inworld-tts-1.5-mini' | 'inworld-tts-1.5-max';

  constructor(config: InworldTTSConfig) {
    this.baseUrl = config.baseUrl || 'https://api.inworld.ai';
    this.workspaceId = config.workspaceId;
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.defaultVoiceId;
    this.defaultFormat = config.defaultFormat || 'wav';
    this.model = config.model || 'inworld-tts-1.5-max';
  }

  private authHeaders() {
    return {
      Authorization: `Basic ${this.apiKey}`,
    } as Record<string, string>;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/voices/v1/voices`;
      const resp = await fetch(url, { headers: this.authHeaders() });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    const rate = this.model === 'inworld-tts-1.5-mini' ? 0.000005 : 0.00001;
    return {
      provider: 'inworld',
      characterCount: params.textLength,
      estimatedCost: params.textLength * rate,
      ratePerCharacter: rate,
    };
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    const params = new URLSearchParams();
    if (languageCode) {
      params.set('languages', this.toInworldLanguageCode(languageCode));
    }
    const qs = params.toString();
    const url = `${this.baseUrl}/voices/v1/voices${qs ? `?${qs}` : ''}`;
    const resp = await fetch(url, { headers: this.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Inworld voices fetch failed: ${resp.status} ${text}`);
    }
    const data: any = await resp.json();
    const items: any[] = Array.isArray(data.voices) ? data.voices : [];
    const voices: Voice[] = items.map((v) => {
      const lc = v.langCode
        ? this.fromInworldLanguageCode(String(v.langCode))
        : 'en';
      return {
        id: v.voiceId,
        name: v.displayName || v.voiceId,
        provider: 'inworld',
        language: lc.split('-')[0],
        languageCode: lc,
        description: v.description || undefined,
        quality: this.model.includes('max') ? 'ultra' : 'premium',
        supportedFormats: this.capabilities.supportedFormats,
        tags: Array.isArray(v.tags) ? v.tags : undefined,
      } as Voice;
    });
    return voices;
  }

  private toInworldLanguageCode(lang: string): string {
    const map: Record<string, string> = {
      en: 'EN_US', es: 'ES_ES', fr: 'FR_FR', ko: 'KO_KR',
      nl: 'NL_NL', zh: 'ZH_CN', de: 'DE_DE', it: 'IT_IT',
      ja: 'JA_JP', pl: 'PL_PL', pt: 'PT_BR', ru: 'RU_RU',
      ar: 'AR_SA', hi: 'HI_IN', he: 'HE_IL',
    };
    return map[lang.split('-')[0].toLowerCase()] || lang.toUpperCase();
  }

  private fromInworldLanguageCode(code: string): string {
    const map: Record<string, string> = {
      EN_US: 'en', ES_ES: 'es', FR_FR: 'fr', KO_KR: 'ko',
      NL_NL: 'nl', ZH_CN: 'zh', DE_DE: 'de', IT_IT: 'it',
      JA_JP: 'ja', PL_PL: 'pl', PT_BR: 'pt', RU_RU: 'ru',
      AR_SA: 'ar', HI_IN: 'hi', HE_IL: 'he',
    };
    return map[code] || code.split('_')[0].toLowerCase();
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const format = options.format || this.defaultFormat;
    const sampleRate = options.sampleRate || this.capabilities.defaultSampleRate;
    let voiceId = options.voiceId || this.defaultVoiceId || DEFAULT_INWORLD_VOICE_ID;
    // "alloy" is an OpenAI voice, not valid for Inworld — fall back to default
    if (voiceId === 'alloy') {
      voiceId = DEFAULT_INWORLD_VOICE_ID;
    }

    const formatMap: Record<string, string> = {
      wav: 'LINEAR16',
      mp3: 'MP3',
      opus: 'OGG_OPUS',
      flac: 'FLAC',
    };

    const url = `${this.baseUrl}/tts/v1/voice`;
    const model = (options.ttsSettings?.model as any) || this.model;
    const payload: any = {
      text: options.text,
      voiceId,
      modelId: model,
      audioConfig: {
        audioEncoding: formatMap[format] || 'LINEAR16',
        sampleRateHertz: sampleRate,
        speakingRate: Math.max(0.5, Math.min(1.5, options.speed || 1)),
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Inworld TTS synthesis failed: ${resp.status} ${text}`);
    }
    let audioBuffer: Buffer;
    let fmt = format;
    try {
      const data: any = await resp.json();
      if (!data || !data.audioContent) throw new Error('No audioContent in response');
      audioBuffer = Buffer.from(String(data.audioContent), 'base64');
    } catch {
      const arr = await resp.arrayBuffer();
      audioBuffer = Buffer.from(arr);
      if (format === 'wav') fmt = 'wav';
    }

    const duration = estimateDurationSeconds(options.text, options.speed || 1);
    const rate = model === 'inworld-tts-1.5-mini' ? 0.000005 : 0.00001;

    return {
      provider: 'inworld',
      voiceId,
      audioBuffer,
      format: fmt,
      sampleRate,
      duration,
      characterCount: options.text.length,
      estimatedCost: options.text.length * rate,
      metadata: {
        characterCount: options.text.length,
        generatedAt: new Date(),
        model,
      },
    };
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample voice preview.';
    return this.generateAudio({
      text,
      voiceId: options.voiceId,
      format: options.format || this.defaultFormat,
    });
  }

  async cloneVoice(request: InworldVoiceCloneRequest): Promise<InworldVoiceCloneResponse> {
    const url = `${this.baseUrl}/voices/v1/voices:clone`;
    const body = {
      displayName: request.displayName,
      langCode: request.langCode,
      voiceSamples: request.voiceSamples,
      ...(request.description && { description: request.description }),
      ...(request.tags?.length && { tags: request.tags }),
      ...(request.audioProcessingConfig && {
        audioProcessingConfig: request.audioProcessingConfig,
      }),
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Inworld voice cloning failed: ${resp.status} ${text}`);
    }

    const data = (await resp.json()) as InworldVoiceCloneResponse;
    return data;
  }
}
