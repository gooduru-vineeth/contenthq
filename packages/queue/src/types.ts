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
    motionAssignment?: string;
    motionSpeed?: number;
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
    transitionType?: string;
    transitionAssignment?: string;
    transitionDuration?: number;
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
    animationStyle?: string;
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
  audioDurationMs?: number;
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
    animationStyle?: string;
  };
}

export interface GenericStageJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  stageId: string;
  templateId: string;
  pipelineRunId: string;
  payload: Record<string, unknown>;
}

export interface PptIngestionJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  inputType: "pptx" | "pdf" | "google_slides" | "keynote" | "url";
  inputFileId?: string;
  inputUrl?: string;
}

export interface SlideRenderingJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  slideId: string;
  slideIndex: number;
  slidevConfig?: {
    theme?: string;
    width?: number;
    height?: number;
  };
}

export interface AudioScriptGenJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  presentationId: string;
  slideIds: string[];
  stageConfig?: {
    provider?: string;
    model?: string;
    energy?: string;
    tone?: string;
  };
}

export interface RemotionCompositionJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  sceneId: string;
  compositionSpec: {
    templateId?: string;
    props?: Record<string, unknown>;
    durationInFrames?: number;
    fps?: number;
    width?: number;
    height?: number;
  };
}

export interface RemotionRenderJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  compositionId: string;
  renderConfig: {
    codec?: string;
    quality?: number;
    fps?: number;
    outputFormat?: string;
  };
}

export interface MotionCanvasSceneJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  sceneId: string;
  sceneSpec: {
    templateId?: string;
    animationProps?: Record<string, unknown>;
    durationInSeconds?: number;
  };
}

export interface MotionCanvasRenderJobData extends BaseFlowJobData {
  projectId: string;
  userId: string;
  sceneIds: string[];
  renderConfig: {
    codec?: string;
    quality?: number;
    fps?: number;
    outputFormat?: string;
    width?: number;
    height?: number;
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
  | CaptionGenerationJobData
  | GenericStageJobData
  | PptIngestionJobData
  | SlideRenderingJobData
  | AudioScriptGenJobData
  | RemotionCompositionJobData
  | RemotionRenderJobData
  | MotionCanvasSceneJobData
  | MotionCanvasRenderJobData;
