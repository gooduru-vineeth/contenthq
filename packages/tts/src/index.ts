// Legacy exports (backward compatible)
export { generateSpeech, getVoices, getDefaultVoice } from "./service";
export { generateOpenAITTS, OPENAI_VOICES } from "./providers/openai-tts";
export { generateElevenLabsTTS, ELEVENLABS_VOICES } from "./providers/elevenlabs-tts";
export type { TTSOptions, TTSResult, TTSProvider, TTSProviderConfig, TTSVoice } from "./types";

// New provider service exports
export { TTSProviderService, getTTSProviderService, initializeTTSProviderService, TTS_PROVIDER_CAPABILITIES, getDefaultTTSProviders } from "./provider-service";
export type { ITTSProvider, Voice, GenerateAudioOptions, AudioGenerationResult, PreviewVoiceOptions, CostEstimate, CostEstimateParams, TTSProviderCapabilities, TTSProviderConfig as ProviderConfig, TTSProviderHealth, LanguageSupport, AudioFormat, VoiceQuality, TTSModelCapabilities, SpeechProvider } from "./provider-service";

// Provider class exports
export { OpenAITTSProvider } from "./providers/openai-tts";
export { ElevenLabsTTSProvider } from "./providers/elevenlabs-tts";
export { GoogleCloudTTSProviderV2 } from "./providers/google-cloud-v2";
export { GoogleGeminiTTSProvider } from "./providers/google-gemini-tts";
export { InworldTTSProvider } from "./providers/inworld";
export { SarvamTTSProvider } from "./providers/sarvam";
