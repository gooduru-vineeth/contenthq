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
  stageConfig?: {
    provider?: string;
    model?: string;
    narrativeStructure?: string;
    temperature?: number;
    maxTokens?: number;
    agentId?: string;
    customInstructions?: string;
  };
}

export interface SceneGenerationJobData extends BaseFlowJobData {
  projectId: string;
  storyId: string;
  userId: string;
  stageConfig?: {
    provider?: string;
    model?: string;
    visualStyle?: string;
    imagePromptStyle?: string;
    agentId?: string;
  };
}

export interface VisualGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  imagePrompt: string;
  mediaOverrideUrl?: string;
  stageConfig?: {
    provider?: string;
    model?: string;
    imageSize?: string;
    quality?: string;
    stylePreset?: string;
  };
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
  mediaOverrideUrl?: string;
  scenePrompt?: string;
  stageConfig?: {
    provider?: string;
    model?: string;
    motionType?: string;
    durationPerScene?: number;
  };
}

export interface TTSGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  narrationScript: string;
  voiceId: string;
  provider: string;
  mediaOverrideUrl?: string;
  stageConfig?: {
    model?: string;
    quality?: string;
    speed?: number;
    pitch?: number;
    format?: string;
  };
}

export interface AudioMixingJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  voiceoverUrl: string;
  musicTrackId: string | null;
  stageConfig?: {
    musicVolume?: number;
    voiceoverVolume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    musicLoop?: boolean;
    musicDuckingEnabled?: boolean;
  };
}

export interface VideoAssemblyJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  sceneIds: string[];
  stageConfig?: {
    transitions?: string;
    outputFormat?: string;
    resolution?: string;
    fps?: number;
    watermarkEnabled?: boolean;
    watermarkText?: string;
    brandingIntroUrl?: string;
    brandingOutroUrl?: string;
  };
  captionConfig?: {
    font?: string;
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    position?: string;
    highlightMode?: string;
    highlightColor?: string;
    wordsPerLine?: number;
    useWordLevelTiming?: boolean;
  };
}

export interface SpeechGenerationJobData extends BaseFlowJobData {
  speechGenerationId: string;
  userId: string;
  projectId?: string;
  text: string;
  provider: string;
  model?: string;
  voiceId: string;
  voiceSettings?: Record<string, unknown>;
}

export interface MediaGenerationJobData extends BaseFlowJobData {
  userId: string;
  projectId?: string;
  generatedMediaId: string;
  prompt: string;
  mediaType: "image" | "video";
  model: string;
  provider: string;
  aspectRatio: string;
  quality: string;
  style?: string;
  duration?: number;
  count: number;
  referenceImageUrl?: string;
  conversationId?: string;
  editOptions?: {
    sourceImageUrl: string;
    strength?: number;
  };
}

export interface CaptionGenerationJobData extends BaseFlowJobData {
  projectId: string;
  sceneId: string;
  userId: string;
  narrationScript: string;
  audioUrl: string;
  stageConfig?: {
    font?: string;
    fontSize?: number;
    fontColor?: string;
    backgroundColor?: string;
    position?: string;
    highlightMode?: string;
    highlightColor?: string;
    wordsPerLine?: number;
    useWordLevelTiming?: boolean;
  };
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
  | VideoAssemblyJobData
  | SpeechGenerationJobData
  | MediaGenerationJobData
  | CaptionGenerationJobData;
