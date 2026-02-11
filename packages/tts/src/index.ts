export { generateSpeech, getVoices, getDefaultVoice } from "./service";
export { generateOpenAITTS, OPENAI_VOICES } from "./providers/openai-tts";
export { generateElevenLabsTTS, ELEVENLABS_VOICES } from "./providers/elevenlabs-tts";
export type { TTSOptions, TTSResult, TTSProvider, TTSProviderConfig, TTSVoice } from "./types";
