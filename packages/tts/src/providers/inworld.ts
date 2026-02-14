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

/**
 * Split text into chunks that respect the Inworld 2000-character limit.
 * Splits at sentence boundaries (. ! ?) to maintain natural speech flow.
 * Falls back to splitting at word boundaries if a single sentence exceeds the limit.
 */
function splitTextIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining);
      break;
    }

    // Find the last sentence boundary within the limit
    let splitAt = -1;
    for (let i = maxChars - 1; i >= 0; i--) {
      if (remaining[i] === '.' || remaining[i] === '!' || remaining[i] === '?') {
        // Include the punctuation and any trailing space
        splitAt = i + 1;
        break;
      }
    }

    // No sentence boundary found — fall back to last space
    if (splitAt <= 0) {
      const lastSpace = remaining.lastIndexOf(' ', maxChars - 1);
      splitAt = lastSpace > 0 ? lastSpace : maxChars;
    }

    chunks.push(remaining.slice(0, splitAt).trim());
    remaining = remaining.slice(splitAt).trim();
  }

  return chunks.filter((c) => c.length > 0);
}

/**
 * Concatenate WAV buffers by combining PCM data and rewriting the header.
 * Assumes all buffers share the same format (sample rate, bit depth, channels).
 */
function concatWavBuffers(buffers: Buffer[]): Buffer {
  if (buffers.length === 1) return buffers[0];

  // Extract PCM data from each WAV (skip 44-byte header)
  const pcmChunks = buffers.map((buf) => {
    // Standard WAV header is 44 bytes; find the 'data' sub-chunk for safety
    const dataOffset = buf.indexOf('data', 0, 'ascii');
    if (dataOffset !== -1) {
      const chunkSize = buf.readUInt32LE(dataOffset + 4);
      return buf.subarray(dataOffset + 8, dataOffset + 8 + chunkSize);
    }
    // Fallback: assume 44-byte header
    return buf.subarray(44);
  });

  const totalPcmSize = pcmChunks.reduce((sum, c) => sum + c.length, 0);
  const header = Buffer.from(buffers[0].subarray(0, 44));

  // Update RIFF chunk size (file size - 8)
  header.writeUInt32LE(36 + totalPcmSize, 4);
  // Update data sub-chunk size
  header.writeUInt32LE(totalPcmSize, 40);

  return Buffer.concat([header, ...pcmChunks]);
}

/**
 * Concatenate audio buffers. WAV requires header rewriting;
 * MP3/OGG_OPUS/FLAC frames are self-synchronizing and can be appended directly.
 */
function concatAudioBuffers(buffers: Buffer[], format: string): Buffer {
  if (buffers.length === 1) return buffers[0];
  if (format === 'wav') return concatWavBuffers(buffers);
  return Buffer.concat(buffers);
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

  private async synthesizeChunk(
    text: string,
    voiceId: string,
    model: string,
    format: string,
    sampleRate: number,
    speed: number,
  ): Promise<{ audioBuffer: Buffer; format: AudioFormat }> {
    const formatMap: Record<string, string> = {
      wav: 'LINEAR16',
      mp3: 'MP3',
      opus: 'OGG_OPUS',
      flac: 'FLAC',
    };

    const url = `${this.baseUrl}/tts/v1/voice`;
    const payload: any = {
      text,
      voiceId,
      modelId: model,
      audioConfig: {
        audioEncoding: formatMap[format] || 'LINEAR16',
        sampleRateHertz: sampleRate,
        speakingRate: Math.max(0.5, Math.min(1.5, speed)),
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: { ...this.authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Inworld TTS synthesis failed: ${resp.status} ${errText}`);
    }

    let audioBuffer: Buffer;
    try {
      const data: any = await resp.json();
      if (!data || !data.audioContent) throw new Error('No audioContent in response');
      audioBuffer = Buffer.from(String(data.audioContent), 'base64');
    } catch {
      const arr = await resp.arrayBuffer();
      audioBuffer = Buffer.from(arr);
    }

    return { audioBuffer, format: format as AudioFormat };
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const format = options.format || this.defaultFormat;
    const sampleRate = options.sampleRate || this.capabilities.defaultSampleRate;
    let voiceId = options.voiceId || this.defaultVoiceId || DEFAULT_INWORLD_VOICE_ID;
    // "alloy" is an OpenAI voice, not valid for Inworld — fall back to default
    if (voiceId === 'alloy') {
      voiceId = DEFAULT_INWORLD_VOICE_ID;
    }

    const model = (options.ttsSettings?.model as any) || this.model;
    const speed = options.speed || 1;

    // Split text into chunks that respect the 2000-character API limit
    const chunks = splitTextIntoChunks(options.text, this.capabilities.maxCharactersPerRequest);

    // Synthesize each chunk sequentially to preserve ordering
    const chunkResults: Buffer[] = [];
    let finalFormat = format;
    for (const chunk of chunks) {
      const result = await this.synthesizeChunk(chunk, voiceId, model, format, sampleRate, speed);
      chunkResults.push(result.audioBuffer);
      finalFormat = result.format;
    }

    const audioBuffer = concatAudioBuffers(chunkResults, finalFormat);
    const duration = estimateDurationSeconds(options.text, speed);
    const rate = model === 'inworld-tts-1.5-mini' ? 0.000005 : 0.00001;

    return {
      provider: 'inworld',
      voiceId,
      audioBuffer,
      format: finalFormat,
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
