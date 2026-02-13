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

export interface InworldTTSConfig {
  provider: Extract<SpeechProvider, 'inworld'>;
  enabled: boolean;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  defaultVoiceId?: string;
  baseUrl?: string;
  workspaceId: string;
  apiKey: string;
  model?: 'inworld-tts-1' | 'inworld-tts-1-max';
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
    maxCharactersPerRequest: 5000,
    supportedFormats: ['wav', 'mp3', 'opus'],
    supportedLanguages: ['en', 'es', 'fr', 'ko', 'nl', 'zh', 'de', 'it', 'ja', 'pl', 'pt', 'ru'],
    supportsSSML: false,
    supportsVoiceCloning: true,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 48000,
    availableQualities: ['premium', 'ultra'],
    models: [
      { modelId: 'inworld-tts-1', name: 'Inworld TTS', supportsEmotionTags: true },
      { modelId: 'inworld-tts-1-max', name: 'Inworld TTS Max', supportsEmotionTags: true },
    ],
  };

  private baseUrl: string;
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat;
  private workspaceId: string;
  private apiKey: string;
  private model: 'inworld-tts-1' | 'inworld-tts-1-max';

  constructor(config: InworldTTSConfig) {
    this.baseUrl = config.baseUrl || 'https://api.inworld.ai';
    this.workspaceId = config.workspaceId;
    this.apiKey = config.apiKey;
    this.defaultVoiceId = config.defaultVoiceId;
    this.defaultFormat = config.defaultFormat || 'wav';
    this.model = config.model || 'inworld-tts-1';
  }

  private authHeaders() {
    return {
      Authorization: `Basic ${this.apiKey}`,
    } as Record<string, string>;
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/voices/v1/workspaces/${this.workspaceId}/voices`;
      const resp = await fetch(url, { headers: this.authHeaders() });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    return {
      provider: 'inworld',
      characterCount: params.textLength,
      estimatedCost: 0,
      ratePerCharacter: 0,
    };
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    const qp = languageCode
      ? `?filter=language=${encodeURIComponent(languageCode.split('-')[0])}`
      : '';
    const url = `${this.baseUrl}/tts/v1/voices${qp}`;
    const resp = await fetch(url, { headers: this.authHeaders() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Inworld voices fetch failed: ${resp.status} ${text}`);
    }
    const data: any = await resp.json();
    const items: any[] = Array.isArray(data.voices) ? data.voices : [];
    const voices: Voice[] = items.map((v) => {
      const firstLang =
        Array.isArray(v.languages) && v.languages.length
          ? String(v.languages[0]).toLowerCase()
          : 'en';
      const lc = firstLang.includes('-') ? firstLang : firstLang;
      return {
        id: v.voiceId,
        name: v.displayName || v.voiceId,
        provider: 'inworld',
        language: lc.split('-')[0],
        languageCode: lc,
        description: v.description || undefined,
        quality: this.model === 'inworld-tts-1-max' ? 'ultra' : 'premium',
        supportedFormats: this.capabilities.supportedFormats,
        tags: Array.isArray(v.tags) ? v.tags : undefined,
      } as Voice;
    });
    return voices;
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const format = options.format || this.defaultFormat;
    const sampleRate = options.sampleRate || this.capabilities.defaultSampleRate;
    const voiceId = options.voiceId || this.defaultVoiceId;
    if (!voiceId) throw new Error('Inworld TTS requires voiceId');

    const url = `${this.baseUrl}/tts/v1/voice`;
    const payload: any = {
      text: options.text,
      voiceId,
      modelId: (options.ttsSettings?.model as any) || this.model,
    };
    if (format === 'wav') {
      payload.audioConfig = {
        audioEncoding: 'LINEAR16',
        sampleRateHertz: sampleRate,
        speakingRate: Math.max(0.5, Math.min(1.5, options.speed || 1)),
      };
    }

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

    return {
      provider: 'inworld',
      voiceId,
      audioBuffer,
      format: fmt,
      sampleRate,
      duration,
      characterCount: options.text.length,
      estimatedCost: 0,
      metadata: {
        characterCount: options.text.length,
        generatedAt: new Date(),
        model: (options.ttsSettings?.model as any) || this.model,
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
