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

import { TextToSpeechClient } from '@google-cloud/text-to-speech';

export interface GoogleGeminiTTSConfig {
  provider: Extract<SpeechProvider, 'google-gemini'>;
  enabled: boolean;
  defaultFormat?: AudioFormat;
  defaultQuality?: VoiceQuality;
  defaultVoiceId?: string;
  model?: 'gemini-2.5-pro-tts' | 'gemini-2.5-flash-tts';
}

function estimateTokenCosts(
  text: string,
  durationSeconds: number,
  model: 'gemini-2.5-pro-tts' | 'gemini-2.5-flash-tts',
) {
  const inputTokens = Math.ceil(text.length / 4);
  const audioTokens = Math.ceil(durationSeconds * 25);
  const rates = model === 'gemini-2.5-pro-tts'
    ? { input: 1.0, output: 20.0 }
    : { input: 0.5, output: 10.0 };
  const estimatedCost = (inputTokens / 1_000_000) * rates.input + (audioTokens / 1_000_000) * rates.output;
  return { inputTokens, audioTokens, estimatedCost, rates };
}

function estimateDurationSeconds(text: string, speakingRate = 1): number {
  const words = text.trim().split(/\s+/).length;
  const minutes = (words / 150) / speakingRate;
  return minutes * 60;
}

export class GoogleGeminiTTSProvider implements ITTSProvider {
  readonly provider: Extract<SpeechProvider, 'google-gemini'> = 'google-gemini';
  readonly capabilities: TTSProviderCapabilities = {
    provider: 'google-gemini',
    maxCharactersPerRequest: 5000,
    supportedFormats: ['mp3', 'wav', 'opus', 'pcm'],
    supportedLanguages: ['en'],
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
      {
        modelId: 'gemini-2.5-pro-tts',
        name: 'Gemini 2.5 Pro TTS',
        supportsEmotionTags: true,
        description: 'Highest quality and control; token-based billing.'
      },
      {
        modelId: 'gemini-2.5-flash-tts',
        name: 'Gemini 2.5 Flash TTS',
        supportsEmotionTags: true,
        description: 'Fast, cost-effective TTS; token-based billing.'
      }
    ],
  };

  private model: 'gemini-2.5-pro-tts' | 'gemini-2.5-flash-tts';
  private defaultVoiceId?: string;
  private defaultFormat: AudioFormat;
  private client: TextToSpeechClient;

  constructor(config: GoogleGeminiTTSConfig) {
    this.model = config.model || 'gemini-2.5-flash-tts';
    this.defaultVoiceId = config.defaultVoiceId;
    this.defaultFormat = config.defaultFormat || 'wav';
    this.client = new TextToSpeechClient();
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
    const durationSeconds = estimateDurationSeconds('x'.repeat(params.textLength));
    const { estimatedCost } = estimateTokenCosts('x'.repeat(params.textLength), durationSeconds, this.model);
    return {
      provider: 'google-gemini',
      characterCount: params.textLength,
      estimatedCost,
      ratePerCharacter: estimatedCost / Math.max(1, params.textLength),
      ratePerMinute: (estimatedCost / Math.max(1, durationSeconds)) * 60,
    };
  }

  async generateAudio(options: GenerateAudioOptions): Promise<AudioGenerationResult> {
    const languageCode = options.languageCode || 'en-US';
    const voiceId = options.voiceId || this.defaultVoiceId || 'Kore';
    const audioFormat = options.format || this.defaultFormat;

    const synthesisInput: any = { text: options.text } as any;
    if (options.ttsSettings?.instructions) {
      synthesisInput.prompt = String(options.ttsSettings.instructions);
    }

    const voice: any = {
      languageCode,
      name: voiceId,
      modelName: this.model
    };

    const audioConfig: any = {
      audioEncoding: ((): any => {
        switch (audioFormat) {
          case 'mp3':
            return 'MP3';
          case 'opus':
            return 'OGG_OPUS';
          case 'wav':
          case 'pcm':
            return 'LINEAR16';
          default:
            return 'LINEAR16';
        }
      })(),
      sampleRateHertz: 24000,
    };
    if (options.sampleRate) audioConfig.sampleRateHertz = options.sampleRate;
    if (options.speed) audioConfig.speakingRate = options.speed;
    if (typeof options.pitch === 'number') audioConfig.pitch = options.pitch;

    const [response] = await this.client.synthesizeSpeech({
      input: synthesisInput,
      voice,
      audioConfig,
    } as any);
    if (!response.audioContent) {
      throw new Error('Gemini TTS returned no audio content');
    }
    const audioBuffer = Buffer.from(response.audioContent as Buffer);

    const durationSeconds = estimateDurationSeconds(options.text, options.speed || 1);
    const tokenCosts = estimateTokenCosts(options.text, durationSeconds, this.model);

    return {
      provider: 'google-gemini',
      voiceId,
      audioBuffer,
      format: audioFormat,
      sampleRate: 24000,
      duration: durationSeconds,
      characterCount: options.text.length,
      estimatedCost: tokenCosts.estimatedCost,
      metadata: {
        characterCount: options.text.length,
        generatedAt: new Date(),
        model: this.model,
        instructions: options.ttsSettings?.instructions,
      },
    };
  }

  getSupportedLanguages(): string[] {
    return this.capabilities.supportedLanguages;
  }

  async getVoices(): Promise<Voice[]> {
    const names = [
      'Achernar','Achird','Algenib','Algieba','Alnilam','Aoede','Autonoe','Callirrhoe','Charon','Despina','Enceladus','Erinome','Fenrir','Gacrux','Iapetus','Kore','Laomedeia','Leda','Orus','Pulcherrima','Puck','Rasalgethi','Sadachbia','Sadaltager','Schedar','Sulafat','Umbriel','Vindemiatrix','Zephyr','Zubenelgenubi'
    ];
    const voices: Voice[] = names.map((n) => ({
      id: n,
      name: n,
      provider: 'google-gemini' as const,
      language: 'en',
      languageCode: 'en-US',
      quality: this.model === 'gemini-2.5-pro-tts' ? 'ultra' as const : 'premium' as const,
      supportedFormats: this.capabilities.supportedFormats,
      tags: ['gemini-tts'],
    }));
    return voices;
  }

  async previewVoice(options: PreviewVoiceOptions): Promise<AudioGenerationResult> {
    const text = options.sampleText || 'This is a sample Gemini TTS preview.';
    return this.generateAudio({
      text,
      voiceId: options.voiceId,
      format: options.format || this.defaultFormat,
    });
  }
}
