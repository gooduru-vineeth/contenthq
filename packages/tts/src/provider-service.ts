/**
 * TTS (Text-to-Speech) Provider Service
 *
 * Unified interface for text-to-speech using multiple providers:
 * OpenAI, Google Cloud TTS, Gemini TTS, Inworld, ElevenLabs, and Sarvam.
 */

import { OpenAITTSProvider } from './providers/openai-tts';
import { GoogleCloudTTSProviderV2 } from './providers/google-cloud-v2';
import { GoogleGeminiTTSProvider } from './providers/google-gemini-tts';
import { InworldTTSProvider } from './providers/inworld';
import { ElevenLabsTTSProvider } from './providers/elevenlabs-tts';
import { SarvamTTSProvider } from './providers/sarvam';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Supported TTS providers.
 * Named SpeechProvider to avoid collision with legacy TTSProvider in types.ts
 */
export type SpeechProvider = 'openai' | 'google' | 'google-gemini' | 'inworld' | 'elevenlabs' | 'sarvam';

/**
 * Audio format options
 */
export type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/**
 * Voice quality levels
 */
export type VoiceQuality = 'standard' | 'premium' | 'ultra';

/**
 * Voice information
 */
export interface Voice {
  accent?: string;
  description?: string;
  gender?: 'male' | 'female' | 'neutral';
  id: string;
  language: string;
  languageCode: string;
  name: string;
  previewUrl?: string;
  provider: SpeechProvider;
  quality: VoiceQuality;
  supportedFormats: AudioFormat[];
  tags?: string[];
}

/**
 * TTS generation options
 */
export interface GenerateAudioOptions {
  format?: AudioFormat;
  languageCode?: string;
  pitch?: number; // -20 to 20 semitones, default 0
  quality?: VoiceQuality;
  sampleRate?: number; // Hz (e.g., 24000, 48000)
  speed?: number; // 0.25 to 4.0, default 1.0
  text: string;
  voiceId: string;
  volume?: number; // 0.0 to 1.0, default 1.0
  ttsSettings?: {
    model?: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';
    instructions?: string;
    [key: string]: any;
  };
}

/**
 * Audio generation result
 */
export interface AudioGenerationResult {
  audioBuffer: Buffer;
  audioUrl?: string;
  characterCount: number;
  duration: number;
  estimatedCost: number;
  format: AudioFormat;
  metadata: {
    characterCount: number;
    generatedAt: Date;
    model?: string;
    instructions?: string;
  };
  provider: SpeechProvider;
  sampleRate: number;
  voiceId: string;
}

/**
 * Voice preview options
 */
export interface PreviewVoiceOptions {
  format?: AudioFormat;
  sampleText?: string;
  voiceId: string;
}

/**
 * Cost estimation parameters
 */
export interface CostEstimateParams {
  format?: AudioFormat;
  quality?: VoiceQuality;
  textLength: number;
  voiceId: string;
}

/**
 * Cost estimation result
 */
export interface CostEstimate {
  characterCount: number;
  estimatedCost: number;
  provider: SpeechProvider;
  ratePerCharacter: number;
  ratePerMinute?: number;
}

/**
 * Model-specific capabilities
 */
export interface TTSModelCapabilities {
  description?: string;
  modelId: string;
  name?: string;
  supportsEmotionTags: boolean;
}

/**
 * Provider capabilities
 */
export interface TTSProviderCapabilities {
  availableQualities: VoiceQuality[];
  costPerCharacter: number;
  costPerMinute?: number;
  defaultSampleRate: number;
  maxCharactersPerRequest: number;
  maxSpeed: number;
  minSpeed: number;
  models?: TTSModelCapabilities[];
  provider: SpeechProvider;
  supportedFormats: AudioFormat[];
  supportedLanguages: string[];
  supportsEmotions: boolean;
  supportsSSML: boolean;
  supportsSpeechMarks: boolean;
  supportsVoiceCloning: boolean;
}

/**
 * Provider configuration
 */
export interface TTSProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  defaultVoiceId?: string;
  enabled: boolean;
  provider: SpeechProvider;
}

/**
 * Provider health status
 */
export interface TTSProviderHealth {
  available: boolean;
  error?: string;
  lastChecked: Date;
  latency?: number;
  provider: SpeechProvider;
}

/**
 * Language support information
 */
export interface LanguageSupport {
  code: string;
  name: string;
  nativeName: string;
  providers: SpeechProvider[];
  voiceCount: number;
}

// ============================================================================
// Provider Interfaces
// ============================================================================

/**
 * Base interface that all TTS providers must implement
 */
export interface ITTSProvider {
  readonly capabilities: TTSProviderCapabilities;
  checkAvailability(): Promise<boolean>;
  estimateCost(params: CostEstimateParams): Promise<CostEstimate>;
  generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult>;
  getSupportedLanguages(): string[];
  getVoices(languageCode?: string): Promise<Voice[]>;
  previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult>;
  readonly provider: SpeechProvider;
}

// ============================================================================
// Provider Capabilities Registry
// ============================================================================

export const TTS_PROVIDER_CAPABILITIES: Record<SpeechProvider, TTSProviderCapabilities> = {
  openai: {
    provider: 'openai',
    maxCharactersPerRequest: 4096,
    supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
    supportedLanguages: [
      'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da',
      'nl', 'en', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'he', 'hi', 'hu', 'is',
      'id', 'it', 'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms', 'mr', 'mi',
      'ne', 'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw',
      'sv', 'tl', 'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy',
    ],
    supportsSSML: false,
    supportsVoiceCloning: false,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0.000_015,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 24_000,
    availableQualities: ['standard', 'premium'],
    models: [
      {
        modelId: 'tts-1',
        name: 'TTS-1 Standard',
        supportsEmotionTags: false,
        description: 'Standard quality, low latency text-to-speech',
      },
      {
        modelId: 'tts-1-hd',
        name: 'TTS-1 HD',
        supportsEmotionTags: false,
        description: 'High definition quality text-to-speech',
      },
      {
        modelId: 'gpt-4o-mini-tts',
        name: 'GPT-4o Mini TTS',
        supportsEmotionTags: true,
        description: 'Advanced TTS with voice instructions for accent, emotion, tone control',
      },
    ],
  },
  google: {
    provider: 'google',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['mp3', 'opus', 'wav', 'pcm', 'flac'],
    supportedLanguages: ['en-US'],
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
      { modelId: 'chirp-3-hd', name: 'Chirp 3 HD voices', supportsEmotionTags: false },
      { modelId: 'neural2', name: 'Neural2 voices', supportsEmotionTags: false },
      { modelId: 'wavenet', name: 'WaveNet voices', supportsEmotionTags: false },
      { modelId: 'standard', name: 'Standard voices', supportsEmotionTags: false },
    ],
  },
  'google-gemini': {
    provider: 'google-gemini',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['mp3', 'wav', 'opus', 'pcm'],
    supportedLanguages: [
      'ar-EG','nl-NL','en-IN','en-US','fr-FR','de-DE','hi-IN','id-ID','it-IT','ja-JP','ko-KR','mr-IN','pl-PL','pt-BR','ro-RO','ru-RU','es-ES','ta-IN','te-IN','th-TH','tr-TR','uk-UA','vi-VN',
      'af-ZA','sq-AL','am-ET','ar-001','hy-AM','az-AZ','bn-BD','eu-ES','be-BY','bg-BG','my-MM','ca-ES','ceb-PH','cmn-CN','cmn-tw','hr-HR','cs-CZ','da-DK','en-AU','en-GB','et-EE','fil-PH','fi-FI','fr-CA','gl-ES','ka-GE','el-GR','gu-IN','ht-HT','he-IL','hu-HU','is-IS','jv-JV','kn-IN','kok-IN','lo-LA','la-VA','lv-LV','lt-LT','lb-LU','mk-MK','mai-IN','mg-MG','ms-MY','ml-IN','mn-MN','ne-NP','nb-NO','nn-NO','or-IN','ps-AF','fa-IR','pt-PT','pa-IN','sr-RS','sd-IN','si-LK','sk-SK','sl-SI','es-419','es-MX','sw-KE','sv-SE','ur-PK',
    ],
    supportsSSML: true,
    supportsVoiceCloning: false,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 24000,
    availableQualities: ['premium', 'ultra'],
    models: [
      { modelId: 'gemini-2.5-pro-tts', name: 'Gemini 2.5 Pro TTS', supportsEmotionTags: true },
      { modelId: 'gemini-2.5-flash-tts', name: 'Gemini 2.5 Flash TTS', supportsEmotionTags: true },
    ],
  },
  inworld: {
    provider: 'inworld',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['wav', 'mp3', 'opus'],
    supportedLanguages: ['en','es','fr','ko','nl','zh','de','it','ja','pl','pt','ru'],
    supportsSSML: false,
    supportsVoiceCloning: true,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 24000,
    availableQualities: ['premium', 'ultra'],
    models: [
      { modelId: 'inworld-tts-1', name: 'Inworld TTS', supportsEmotionTags: true },
      { modelId: 'inworld-tts-1-max', name: 'Inworld TTS Max', supportsEmotionTags: true },
    ],
  },
  elevenlabs: {
    provider: 'elevenlabs',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['mp3', 'wav'],
    supportedLanguages: ['en'],
    supportsSSML: false,
    supportsVoiceCloning: true,
    supportsEmotions: true,
    supportsSpeechMarks: false,
    costPerCharacter: 0,
    minSpeed: 0.25,
    maxSpeed: 4,
    defaultSampleRate: 44100,
    availableQualities: ['standard', 'premium'],
  },
  sarvam: {
    provider: 'sarvam',
    maxCharactersPerRequest: 2500,
    supportedFormats: ['mp3', 'wav', 'opus', 'flac', 'aac'],
    supportedLanguages: [
      'hi-IN', 'bn-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'od-IN', 'pa-IN', 'ta-IN', 'te-IN', 'en-IN', 'gu-IN',
      // Short codes for backward compatibility
      'hi', 'bn', 'kn', 'ml', 'mr', 'od', 'pa', 'ta', 'te', 'en', 'gu',
    ],
    supportsSSML: false,
    supportsVoiceCloning: false,
    supportsEmotions: false,
    supportsSpeechMarks: false,
    costPerCharacter: 0,
    minSpeed: 0.5,
    maxSpeed: 2,
    defaultSampleRate: 22050,
    availableQualities: ['standard'],
  },
};

// ============================================================================
// Default Provider Configurations
// ============================================================================

/**
 * Default provider configuration from environment variables.
 * Called lazily to ensure env vars are loaded.
 */
export function getDefaultTTSProviders(): TTSProviderConfig[] {
  const providers: TTSProviderConfig[] = [];

  providers.push({
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY,
    defaultVoiceId: 'coral',
    defaultFormat: 'wav',
    defaultQuality: 'standard',
  });

  const hasGoogleSA = !!process.env.GOOGLE_APPLICATION_CREDENTIALS || !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  providers.push({
    provider: 'google',
    enabled: hasGoogleSA,
    defaultVoiceId: 'en-US-Neural2-D',
    defaultFormat: 'wav',
    defaultQuality: 'premium',
  } as TTSProviderConfig);

  const hasVertex = hasGoogleSA && (!!process.env.GOOGLE_VERTEX_PROJECT || !!process.env.GOOGLE_PROJECT_ID);
  providers.push({
    provider: 'google-gemini',
    enabled: hasVertex,
    defaultVoiceId: 'gemini-pro-default',
    defaultFormat: 'wav',
    defaultQuality: 'ultra',
  } as TTSProviderConfig);

  const hasInworld = !!process.env.INWORLD_API_KEY && !!process.env.INWORLD_WORKSPACE_ID;
  providers.push({
    provider: 'inworld',
    enabled: hasInworld,
    defaultVoiceId: undefined as any,
    defaultFormat: 'wav',
    defaultQuality: 'ultra',
    baseUrl: process.env.INWORLD_API_BASE_URL,
  } as TTSProviderConfig);

  const hasElevenLabs = !!process.env.ELEVENLABS_API_KEY;
  providers.push({
    provider: 'elevenlabs',
    apiKey: process.env.ELEVENLABS_API_KEY,
    enabled: hasElevenLabs,
    defaultVoiceId: 'EXAVITQu4vr4xnSDxMaL',
    defaultFormat: 'wav',
    defaultQuality: 'premium',
  });

  const hasSarvam = !!process.env.SARVAM_API_KEY;
  providers.push({
    provider: 'sarvam',
    apiKey: process.env.SARVAM_API_KEY,
    enabled: hasSarvam,
    defaultVoiceId: 'shubh',
    defaultFormat: 'mp3',
    defaultQuality: 'standard',
  });

  return providers;
}

// For backward compatibility
export const DEFAULT_TTS_PROVIDERS: TTSProviderConfig[] = getDefaultTTSProviders();

// ============================================================================
// TTS Provider Service Class
// ============================================================================

export class TTSProviderService {
  private providers: Map<SpeechProvider, ITTSProvider> = new Map();
  private configs: TTSProviderConfig[];
  private healthCache: Map<SpeechProvider, TTSProviderHealth> = new Map();
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(configs?: TTSProviderConfig[]) {
    this.configs = configs || DEFAULT_TTS_PROVIDERS.filter((c) => c.enabled);

    if (this.configs.length === 0) {
      console.warn('No TTS providers configured. Please set API keys in environment variables.');
    }
  }

  /**
   * Initialize providers (lazy loading)
   */
  private async getProvider(providerType: SpeechProvider): Promise<ITTSProvider> {
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    const config = this.configs.find((c) => c.provider === providerType);
    if (!config || !config.enabled) {
      throw new Error(`Provider ${providerType} is not configured or enabled`);
    }

    let provider: ITTSProvider;
    if (providerType === 'openai') {
      provider = new OpenAITTSProvider(config);
    } else if (providerType === 'google') {
      let credentials: any | undefined;
      const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (saJson) {
        try { credentials = JSON.parse(saJson); } catch { /* ignore */ }
      }
      provider = new GoogleCloudTTSProviderV2({
        provider: 'google',
        enabled: true,
        defaultVoiceId: config.defaultVoiceId || 'en-US-Neural2-D',
        defaultFormat: (config.defaultFormat || 'wav') as AudioFormat,
        defaultQuality: (config.defaultQuality || 'premium') as VoiceQuality,
        serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        credentials,
        enableCaching: true,
        cacheTTL: 3600,
        maxConcurrentRequests: 50,
      });
    } else if (providerType === 'google-gemini') {
      provider = new GoogleGeminiTTSProvider({
        provider: 'google-gemini',
        enabled: true,
        defaultFormat: (config.defaultFormat || 'wav') as AudioFormat,
        defaultQuality: (config.defaultQuality || 'ultra') as VoiceQuality,
        defaultVoiceId: config.defaultVoiceId || 'Kore',
        model: (process.env.GEMINI_TTS_MODEL as 'gemini-2.5-pro-tts' | 'gemini-2.5-flash-tts') || 'gemini-2.5-flash-tts',
      });
    } else if (providerType === 'inworld') {
      const apiKey = process.env.INWORLD_API_KEY;
      const workspace = process.env.INWORLD_WORKSPACE_ID;
      if (!apiKey || !workspace) {
        throw new Error('Inworld TTS not configured. Set INWORLD_API_KEY and INWORLD_WORKSPACE_ID');
      }
      provider = new InworldTTSProvider({
        provider: 'inworld',
        enabled: true,
        apiKey,
        workspaceId: workspace,
        defaultFormat: (config?.defaultFormat || 'wav') as AudioFormat,
        defaultQuality: (config?.defaultQuality || 'ultra') as VoiceQuality,
        defaultVoiceId: config?.defaultVoiceId as any,
        baseUrl: (config as any)?.baseUrl,
        model: (process.env.INWORLD_TTS_MODEL as 'inworld-tts-1' | 'inworld-tts-1-max') || 'inworld-tts-1',
      });
    } else if (providerType === 'elevenlabs') {
      const apiKey = config.apiKey || process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs TTS not configured. Set ELEVENLABS_API_KEY');
      }
      provider = new ElevenLabsTTSProvider({
        provider: 'elevenlabs',
        enabled: true,
        apiKey,
        defaultVoiceId: config.defaultVoiceId,
        defaultFormat: config.defaultFormat,
        defaultQuality: config.defaultQuality,
        baseUrl: config.baseUrl,
      });
    } else if (providerType === 'sarvam') {
      const apiKey = config.apiKey || process.env.SARVAM_API_KEY;
      if (!apiKey) {
        throw new Error('Sarvam TTS not configured. Set SARVAM_API_KEY');
      }
      provider = new SarvamTTSProvider({
        provider: 'sarvam',
        enabled: true,
        apiKey,
        defaultVoiceId: config.defaultVoiceId,
        defaultFormat: config.defaultFormat,
        defaultQuality: config.defaultQuality,
        baseUrl: config.baseUrl,
      });
    } else {
      throw new Error(`Unknown TTS provider: ${providerType}`);
    }
    this.providers.set(providerType, provider);
    return provider;
  }

  // ==========================================================================
  // Audio Generation
  // ==========================================================================

  async generateAudio(
    options: GenerateAudioOptions,
    preferredProvider?: SpeechProvider,
    triedProviders: Set<SpeechProvider> = new Set(),
  ): Promise<AudioGenerationResult> {
    if (!options.text || options.text.trim().length === 0) {
      throw new Error('Text cannot be empty for audio generation');
    }

    const provider = await this.selectProvider(preferredProvider, options.languageCode);

    if (triedProviders.has(provider)) {
      console.error(
        `[TTS] Provider ${provider} already tried, stopping fallback to prevent infinite loop`,
      );
      throw new Error(`All TTS providers failed. Tried: ${Array.from(triedProviders).join(', ')}`);
    }

    triedProviders.add(provider);
    const providerInstance = await this.getProvider(provider);

    try {
      const result = await providerInstance.generateAudio(options);
      return result;
    } catch (error) {
      console.error(
        `[TTS] Provider ${provider} failed with error:`,
        error instanceof Error ? error.message : error,
      );

      this.markProviderUnhealthy(provider, error);

      if (this.hasFallbackProvider(provider) && triedProviders.size < this.configs.length) {
        console.warn(
          `Provider ${provider} failed, trying fallback... (${triedProviders.size}/${this.configs.length} providers tried)`,
        );
        const fallbackProvider = this.getNextProvider(provider, options.languageCode);
        if (fallbackProvider && !triedProviders.has(fallbackProvider)) {
          return this.generateAudio(options, fallbackProvider, triedProviders);
        }
      }

      const errorMessage = `All TTS providers failed. Tried: ${Array.from(triedProviders).join(', ')}. Last error from ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[TTS] ${errorMessage}`);
      throw new Error(errorMessage);
    }
  }

  // ==========================================================================
  // Voice Management
  // ==========================================================================

  async getVoices(languageCode?: string): Promise<Voice[]> {
    const allVoices: Voice[] = [];

    for (const config of this.configs.filter((c) => c.enabled)) {
      try {
        const provider = await this.getProvider(config.provider);
        const voices = await provider.getVoices(languageCode);
        allVoices.push(...voices);
      } catch (error) {
        console.warn(`Failed to get voices from ${config.provider}:`, error);
      }
    }

    return allVoices;
  }

  async getVoicesByProvider(provider: SpeechProvider, languageCode?: string): Promise<Voice[]> {
    const providerInstance = await this.getProvider(provider);
    return providerInstance.getVoices(languageCode);
  }

  async previewVoice(
    options: PreviewVoiceOptions,
    provider?: SpeechProvider,
  ): Promise<AudioGenerationResult> {
    let selectedProvider = provider;

    if (!selectedProvider) {
      const voices = await this.getVoices();
      const voice = voices.find((v) => v.id === options.voiceId);
      if (!voice) {
        throw new Error(`Voice ${options.voiceId} not found`);
      }
      selectedProvider = voice.provider;
    }

    const providerInstance = await this.getProvider(selectedProvider);
    return providerInstance.previewVoice(options);
  }

  // ==========================================================================
  // Cost Estimation
  // ==========================================================================

  async estimateCost(params: CostEstimateParams, provider?: SpeechProvider): Promise<CostEstimate> {
    let selectedProvider = provider;

    if (!selectedProvider) {
      const voices = await this.getVoices();
      const voice = voices.find((v) => v.id === params.voiceId);
      if (!voice) {
        throw new Error(`Voice ${params.voiceId} not found`);
      }
      selectedProvider = voice.provider;
    }

    const providerInstance = await this.getProvider(selectedProvider);
    return providerInstance.estimateCost(params);
  }

  async compareCosts(params: CostEstimateParams): Promise<CostEstimate[]> {
    const estimates: CostEstimate[] = [];

    for (const config of this.configs.filter((c) => c.enabled)) {
      try {
        const provider = await this.getProvider(config.provider);
        const estimate = await provider.estimateCost({
          ...params,
          voiceId: config.defaultVoiceId || params.voiceId,
        });
        estimates.push(estimate);
      } catch (error) {
        console.warn(`Failed to estimate cost for ${config.provider}:`, error);
      }
    }

    return estimates.sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  // ==========================================================================
  // Provider Management
  // ==========================================================================

  async checkAvailability(provider: SpeechProvider): Promise<boolean> {
    const cached = this.healthCache.get(provider);

    if (cached && Date.now() - cached.lastChecked.getTime() < this.HEALTH_CHECK_INTERVAL) {
      return cached.available;
    }

    try {
      const providerInstance = await this.getProvider(provider);
      const available = await providerInstance.checkAvailability();

      this.healthCache.set(provider, {
        provider,
        available,
        lastChecked: new Date(),
      });

      return available;
    } catch (error) {
      this.healthCache.set(provider, {
        provider,
        available: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return false;
    }
  }

  async getSupportedLanguages(): Promise<LanguageSupport[]> {
    const languageMap = new Map<string, LanguageSupport>();

    for (const config of this.configs.filter((c) => c.enabled)) {
      try {
        const provider = await this.getProvider(config.provider);
        const languages = provider.getSupportedLanguages();
        const voices = await provider.getVoices();

        for (const lang of languages) {
          const existing = languageMap.get(lang);
          const voiceCount = voices.filter((v) => v.languageCode === lang).length;

          if (existing) {
            existing.providers.push(config.provider);
            existing.voiceCount += voiceCount;
          } else {
            languageMap.set(lang, {
              code: lang,
              name: this.getLanguageName(lang),
              nativeName: this.getLanguageNativeName(lang),
              providers: [config.provider],
              voiceCount,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to get languages from ${config.provider}:`, error);
      }
    }

    return Array.from(languageMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  getCapabilities(provider: SpeechProvider): TTSProviderCapabilities {
    return TTS_PROVIDER_CAPABILITIES[provider];
  }

  getAvailableProviders(): TTSProviderConfig[] {
    return this.configs.filter((c) => c.enabled);
  }

  getProviderHealth(provider: SpeechProvider): TTSProviderHealth | undefined {
    return this.healthCache.get(provider);
  }

  getAllProviderHealth(): TTSProviderHealth[] {
    return Array.from(this.healthCache.values());
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  private async selectProvider(
    preferredProvider?: SpeechProvider,
    languageCode?: string,
  ): Promise<SpeechProvider> {
    if (preferredProvider) {
      const config = this.configs.find((c) => c.provider === preferredProvider && c.enabled);
      if (config) {
        return preferredProvider;
      }
    }

    if (languageCode) {
      for (const config of this.configs.filter((c) => c.enabled)) {
        const capabilities = TTS_PROVIDER_CAPABILITIES[config.provider];
        if (capabilities.supportedLanguages.includes(languageCode)) {
          return config.provider;
        }
      }
    }

    const availableConfig = this.configs.find((c) => c.enabled);
    if (!availableConfig) {
      throw new Error('No TTS providers available. Please configure API keys.');
    }

    return availableConfig.provider;
  }

  private markProviderUnhealthy(providerName: SpeechProvider, error: unknown): void {
    this.healthCache.set(providerName, {
      provider: providerName,
      available: false,
      lastChecked: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  private hasFallbackProvider(_currentProvider: SpeechProvider): boolean {
    return false;
  }

  private getNextProvider(
    _currentProvider: SpeechProvider,
    _languageCode?: string,
  ): SpeechProvider | undefined {
    return undefined;
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      pt: 'Portuguese',
      hi: 'Hindi',
      bn: 'Bengali',
      ta: 'Tamil',
      te: 'Telugu',
      gu: 'Gujarati',
      kn: 'Kannada',
      ml: 'Malayalam',
      mr: 'Marathi',
      pa: 'Punjabi',
      or: 'Odia',
      ar: 'Arabic',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ru: 'Russian',
      tr: 'Turkish',
      nl: 'Dutch',
      pl: 'Polish',
      cs: 'Czech',
    };
    return names[code] || code.toUpperCase();
  }

  private getLanguageNativeName(code: string): string {
    const nativeNames: Record<string, string> = {
      en: 'English',
      es: 'Espanol',
      fr: 'Francais',
      de: 'Deutsch',
      it: 'Italiano',
      pt: 'Portugues',
      hi: 'Hindi',
      bn: 'Bangla',
      ta: 'Tamil',
      te: 'Telugu',
      gu: 'Gujarati',
      kn: 'Kannada',
      ml: 'Malayalam',
      mr: 'Marathi',
      pa: 'Punjabi',
      or: 'Odia',
      ar: 'Arabic',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ru: 'Russian',
      tr: 'Turkish',
      nl: 'Nederlands',
      pl: 'Polski',
      cs: 'Czech',
    };
    return nativeNames[code] || code.toUpperCase();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let ttsServiceInstance: TTSProviderService | null = null;

export function getTTSProviderService(): TTSProviderService {
  if (!ttsServiceInstance) {
    ttsServiceInstance = new TTSProviderService();
  }
  return ttsServiceInstance;
}

export function initializeTTSProviderService(configs: TTSProviderConfig[]): TTSProviderService {
  ttsServiceInstance = new TTSProviderService(configs);
  return ttsServiceInstance;
}
