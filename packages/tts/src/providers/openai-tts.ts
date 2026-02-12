import type { TTSOptions, TTSResult, TTSVoice } from "../types";
import type {
  AudioGenerationResult,
  CostEstimate,
  CostEstimateParams,
  GenerateAudioOptions,
  ITTSProvider,
  PreviewVoiceOptions,
  TTSProviderCapabilities,
  TTSProviderConfig,
  Voice,
} from '../provider-service';
import { TTS_PROVIDER_CAPABILITIES } from '../provider-service';

export const OPENAI_VOICES: TTSVoice[] = [
  { id: "alloy", name: "Alloy", language: "en", gender: "neutral" },
  { id: "echo", name: "Echo", language: "en", gender: "male" },
  { id: "fable", name: "Fable", language: "en", gender: "female" },
  { id: "onyx", name: "Onyx", language: "en", gender: "male" },
  { id: "nova", name: "Nova", language: "en", gender: "female" },
  { id: "shimmer", name: "Shimmer", language: "en", gender: "female" },
];

export async function generateOpenAITTS(options: TTSOptions): Promise<TTSResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is required for TTS");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: options.text,
      voice: options.voiceId || "alloy",
      speed: options.speed ?? 1.0,
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS failed: ${error}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  // Estimate duration: ~150 words per minute, average word = 5 chars
  const wordCount = options.text.split(/\s+/).length;
  const estimatedDuration = Math.ceil((wordCount / 150) * 60);

  return {
    audioBuffer: buffer,
    duration: estimatedDuration,
    provider: "openai",
    voiceId: options.voiceId || "alloy",
    format: "mp3",
  };
}

// ============================================================================
// OpenAI TTS Provider (ITTSProvider implementation)
// ============================================================================

const OPENAI_PROVIDER_VOICES: Voice[] = [
  {
    id: 'alloy', name: 'Alloy', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Neutral and balanced voice suitable for general narration',
    quality: 'standard', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'ash', name: 'Ash', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Warm and conversational voice for engaging content',
    quality: 'standard', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'ballad', name: 'Ballad', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Expressive and dramatic voice perfect for storytelling',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'coral', name: 'Coral', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'female', description: 'Clear and engaging voice ideal for presentations',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'echo', name: 'Echo', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'male', description: 'Professional and clear voice for business content',
    quality: 'standard', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'fable', name: 'Fable', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Storytelling and warm voice for narrative content',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'nova', name: 'Nova', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'female', description: 'Energetic and bright voice for dynamic content',
    quality: 'standard', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'onyx', name: 'Onyx', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'male', description: 'Deep and authoritative voice for serious content',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'sage', name: 'Sage', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Calm and wise voice for educational content',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'shimmer', name: 'Shimmer', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'female', description: 'Soft and gentle voice for soothing content',
    quality: 'standard', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
  {
    id: 'verse', name: 'Verse', provider: 'openai', language: 'English', languageCode: 'en',
    gender: 'neutral', description: 'Rhythmic and poetic voice for artistic content',
    quality: 'premium', supportedFormats: ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'],
  },
];

interface OpenAITTSRequest {
  input: string;
  model: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts';
  voice: string;
  response_format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';
  speed?: number;
  instructions?: string;
}

export class OpenAITTSProvider implements ITTSProvider {
  readonly provider = 'openai' as const;
  readonly capabilities: TTSProviderCapabilities;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: TTSProviderConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.capabilities = TTS_PROVIDER_CAPABILITIES.openai;
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    if (options.text.length > this.capabilities.maxCharactersPerRequest) {
      throw new Error(
        `Text exceeds maximum length of ${this.capabilities.maxCharactersPerRequest} characters`,
      );
    }

    const model = this.getModelForOptions(options);

    const request: OpenAITTSRequest = {
      model,
      input: options.text,
      voice: options.voiceId,
      response_format: options.format || 'wav',
      speed: options.speed || 1,
    };

    if (model === 'gpt-4o-mini-tts' && options.ttsSettings?.instructions) {
      request.instructions = options.ttsSettings.instructions;
    }

    try {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`OpenAI TTS API error: ${JSON.stringify(error)}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);

      const duration = this.estimateDuration(options.text, options.speed || 1);
      const cost = this.calculateCost(options.text.length, model);

      return {
        audioBuffer,
        format: options.format || 'wav',
        duration,
        sampleRate: options.sampleRate || 24_000,
        provider: 'openai',
        voiceId: options.voiceId,
        estimatedCost: cost,
        characterCount: options.text.length,
        metadata: {
          characterCount: options.text.length,
          generatedAt: new Date(),
          model,
          instructions: request.instructions,
        },
      };
    } catch (error) {
      throw new Error(
        `Failed to generate audio with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getVoices(languageCode?: string): Promise<Voice[]> {
    if (languageCode && !this.capabilities.supportedLanguages.includes(languageCode)) {
      return [];
    }
    return OPENAI_PROVIDER_VOICES;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const sampleText =
      options.sampleText || 'Hello, this is a preview of my voice. How do I sound?';
    return this.generateAudio({
      text: sampleText,
      voiceId: options.voiceId,
      format: options.format || 'wav',
    });
  }

  async estimateCost(params: CostEstimateParams): Promise<CostEstimate> {
    const model = params.quality === 'premium' ? 'tts-1-hd' : 'tts-1';
    const cost = this.calculateCost(params.textLength, model);
    return {
      provider: 'openai',
      estimatedCost: cost,
      characterCount: params.textLength,
      ratePerCharacter: this.capabilities.costPerCharacter,
    };
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  private getModelForOptions(options: GenerateAudioOptions): 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts' {
    if (options.ttsSettings?.model) {
      const model = options.ttsSettings.model;
      if (model === 'tts-1' || model === 'tts-1-hd' || model === 'gpt-4o-mini-tts') {
        return model;
      }
    }
    if (options.ttsSettings?.instructions) {
      return 'gpt-4o-mini-tts';
    }
    if (options.quality === 'premium' || options.quality === 'ultra') {
      return 'tts-1-hd';
    }
    return 'tts-1';
  }

  private calculateCost(characterCount: number, model: 'tts-1' | 'tts-1-hd' | 'gpt-4o-mini-tts'): number {
    let costPer1k = 0.015;
    if (model === 'tts-1-hd') {
      costPer1k = 0.03;
    } else if (model === 'gpt-4o-mini-tts') {
      costPer1k = 0.02;
    }
    return (characterCount / 1000) * costPer1k;
  }

  private estimateDuration(text: string, speed: number): number {
    const words = text.split(/\s+/).length;
    const baseMinutes = words / 150;
    const adjustedMinutes = baseMinutes / speed;
    return adjustedMinutes * 60;
  }
}
