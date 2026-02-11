import type { MediaType } from "./pipeline";

export interface MediaAsset {
  id: string;
  userId: string;
  projectId: string;
  type: MediaType;
  url: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  dimensions: { width: number; height: number } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MusicTrack {
  id: string;
  name: string;
  category: string;
  mood: string;
  bpm: number;
  duration: number;
  url: string;
  storageKey: string;
  source: string;
  createdAt: Date;
}

export interface VoiceProfile {
  id: string;
  name: string;
  provider: string;
  voiceId: string;
  language: string;
  gender: string;
  previewUrl: string | null;
  config: Record<string, unknown>;
  createdAt: Date;
}
