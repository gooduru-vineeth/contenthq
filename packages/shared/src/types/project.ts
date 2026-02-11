export interface Project {
  id: string;
  userId: string;
  title: string;
  status: string;
  inputType: string;
  inputContent: string;
  aspectRatio: string;
  targetDuration: number;
  tone: string;
  language: string;
  voiceProfileId: string | null;
  musicTrackId: string | null;
  finalVideoUrl: string | null;
  thumbnailUrl: string | null;
  progressPercent: number;
  totalCreditsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: string;
  projectId: string;
  title: string;
  hook: string;
  synopsis: string;
  narrativeArc: Record<string, unknown>;
  sceneCount: number;
  version: number;
  aiModelUsed: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Scene {
  id: string;
  storyId: string;
  projectId: string;
  index: number;
  status: string;
  visualDescription: string;
  imagePrompt: string;
  narrationScript: string;
  motionSpec: Record<string, unknown> | null;
  transitions: string | null;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngestedContent {
  id: string;
  projectId: string;
  sourceUrl: string;
  sourcePlatform: string;
  title: string;
  body: string;
  summary: string;
  engagementScore: number;
  createdAt: Date;
  updatedAt: Date;
}
