/** Common fields for flow-aware job data */
export interface BaseFlowJobData {
  /** If part of a flow execution */
  flowExecutionId?: string;
  /** Which flow node dispatched this */
  flowNodeId?: string;
  /** Agent to use instead of inline LLM calls */
  agentId?: string;
}

export interface IngestionJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  sourceUrl: string;
  sourceType: string;
}

export interface StoryWritingJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  ingestedContentIds: string[];
  tone: string;
  targetDuration: number;
}

export interface SceneGenerationJobData extends BaseFlowJobData {
  projectId: string;
  storyId: string;
  userId: string;
}

export interface VisualGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imagePrompt: string;
}

export interface VisualVerificationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imageUrl: string;
  visualDescription: string;
}

export interface VideoGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imageUrl: string;
  motionSpec: Record<string, unknown>;
}

export interface TTSGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  narrationScript: string;
  voiceId: string;
  provider: string;
}

export interface AudioMixingJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  voiceoverUrl: string;
  musicTrackId: string | null;
}

export interface VideoAssemblyJobData extends BaseFlowJobData {
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
