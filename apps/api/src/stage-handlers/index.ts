import { stageRegistry } from "../services/stage-registry";
import { IngestionHandler } from "./ingestion.handler";
import { StoryWritingHandler } from "./story-writing.handler";
import { SceneGenerationHandler } from "./scene-generation.handler";
import { VisualGenerationHandler } from "./visual-generation.handler";
import { VisualVerificationHandler } from "./visual-verification.handler";
import { VideoGenerationHandler } from "./video-generation.handler";
import { TTSGenerationHandler } from "./tts-generation.handler";
import { AudioMixingHandler } from "./audio-mixing.handler";
import { CaptionGenerationHandler } from "./caption-generation.handler";
import { VideoAssemblyHandler } from "./video-assembly.handler";

export { IngestionHandler } from "./ingestion.handler";
export { StoryWritingHandler } from "./story-writing.handler";
export { SceneGenerationHandler } from "./scene-generation.handler";
export { VisualGenerationHandler } from "./visual-generation.handler";
export { VisualVerificationHandler } from "./visual-verification.handler";
export { VideoGenerationHandler } from "./video-generation.handler";
export { TTSGenerationHandler } from "./tts-generation.handler";
export { AudioMixingHandler } from "./audio-mixing.handler";
export { CaptionGenerationHandler } from "./caption-generation.handler";
export { VideoAssemblyHandler } from "./video-assembly.handler";

/**
 * Registers all built-in AI Video pipeline stage handlers with the registry.
 * Call this during application startup.
 */
export function registerBuiltinStageHandlers(): void {
  stageRegistry.register(new IngestionHandler());
  stageRegistry.register(new StoryWritingHandler());
  stageRegistry.register(new SceneGenerationHandler());
  stageRegistry.register(new VisualGenerationHandler());
  stageRegistry.register(new VisualVerificationHandler());
  stageRegistry.register(new VideoGenerationHandler());
  stageRegistry.register(new TTSGenerationHandler());
  stageRegistry.register(new AudioMixingHandler());
  stageRegistry.register(new CaptionGenerationHandler());
  stageRegistry.register(new VideoAssemblyHandler());

  console.warn(
    `[StageHandlers] Registered ${stageRegistry.getRegisteredStageIds().length} built-in stage handlers`
  );
}
