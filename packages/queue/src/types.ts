export interface IngestionJobData {
  projectId: string;
  userId: string;
  sourceUrl: string;
  sourceType: string;
}

export interface StoryWritingJobData {
  projectId: string;
  userId: string;
  ingestedContentIds: string[];
  tone: string;
  targetDuration: number;
}

export interface SceneGenerationJobData {
  projectId: string;
  storyId: string;
  userId: string;
}

export interface VisualGenerationJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imagePrompt: string;
}

export interface VisualVerificationJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imageUrl: string;
  visualDescription: string;
}

export interface VideoGenerationJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imageUrl: string;
  motionSpec: Record<string, unknown>;
}

export interface TTSGenerationJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  narrationScript: string;
  voiceId: string;
  provider: string;
}

export interface AudioMixingJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  voiceoverUrl: string;
  musicTrackId: string | null;
}

export interface VideoAssemblyJobData {
  projectId: string;
  userId: string;
  sceneIds: string[];
}

export type JobData =
  | IngestionJobData
  | StoryWritingJobData
  | SceneGenerationJobData
  | VisualGenerationJobData
  | VisualVerificationJobData
  | VideoGenerationJobData
  | TTSGenerationJobData
  | AudioMixingJobData
  | VideoAssemblyJobData;
