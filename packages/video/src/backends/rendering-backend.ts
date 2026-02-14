/**
 * Interface for rendering backends. Each backend knows how to render
 * individual scenes and assemble them into a final video.
 */
export interface SceneRenderInput {
  projectId: string;
  sceneId: string;
  /** URL or path to the source asset (image, composition spec, etc.) */
  sourceUrl: string;
  /** Duration in seconds */
  duration: number;
  /** Motion/animation specification */
  motionSpec?: Record<string, unknown>;
  /** Output dimensions */
  width?: number;
  height?: number;
  fps?: number;
  /** Additional backend-specific options */
  options?: Record<string, unknown>;
}

export interface SceneRenderOutput {
  /** URL or path to the rendered scene video */
  videoUrl: string;
  duration: number;
  format: string;
  width: number;
  height: number;
}

export interface AssemblyInput {
  projectId: string;
  scenes: Array<{
    videoUrl: string;
    audioUrl?: string;
    duration: number;
    transition?: { type: string; duration?: number };
  }>;
  outputFormat?: string;
  width?: number;
  height?: number;
  fps?: number;
  captionConfig?: Record<string, unknown>;
  watermark?: { text: string; position: string; opacity: number };
  brandingIntroUrl?: string;
  brandingOutroUrl?: string;
}

export interface AssemblyOutput {
  videoUrl: string;
  duration: number;
  format: string;
  size: number;
}

export interface RenderingBackend {
  readonly id: string;
  readonly name: string;
  renderScene(input: SceneRenderInput): Promise<SceneRenderOutput>;
  assembleProject(input: AssemblyInput): Promise<AssemblyOutput>;
  isAvailable(): Promise<boolean>;
}
