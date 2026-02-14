interface Closeable {
  name: string;
  close(): Promise<void>;
}

const workers: Closeable[] = [];

export async function initWorkers(): Promise<void> {
  console.warn("[Workers] Initializing workers...");

  const { createIngestionWorker } = await import("./ingestion.worker");
  const { createStoryWritingWorker } = await import("./story-writing.worker");
  const { createSceneGenerationWorker } = await import("./scene-generation.worker");
  const { createVisualGenerationWorker } = await import("./visual-generation.worker");
  const { createVisualVerificationWorker } = await import("./visual-verification.worker");
  const { createVideoGenerationWorker } = await import("./video-generation.worker");

  workers.push(createIngestionWorker());
  workers.push(createStoryWritingWorker());
  workers.push(createSceneGenerationWorker());
  workers.push(createVisualGenerationWorker());
  workers.push(createVisualVerificationWorker());
  workers.push(createVideoGenerationWorker());

  const { createTTSGenerationWorker } = await import("./tts-generation.worker");
  const { createAudioMixingWorker } = await import("./audio-mixing.worker");
  const { createVideoAssemblyWorker } = await import("./video-assembly.worker");

  workers.push(createTTSGenerationWorker());
  workers.push(createAudioMixingWorker());
  workers.push(createVideoAssemblyWorker());

  // Audio-first pipeline workers
  const { createScriptGenerationWorker } = await import("./script-generation.worker");
  const { createSTTTimestampsWorker } = await import("./stt-timestamps.worker");
  workers.push(createScriptGenerationWorker());
  workers.push(createSTTTimestampsWorker());

  const { createSpeechGenerationWorker } = await import(
    "./speech-generation.worker"
  );
  workers.push(createSpeechGenerationWorker());

  const { createMediaGenerationWorker } = await import(
    "./media-generation.worker"
  );
  workers.push(createMediaGenerationWorker());

  const { createCaptionGenerationWorker } = await import(
    "./caption-generation.worker"
  );
  workers.push(createCaptionGenerationWorker());

  // Presentation pipeline workers
  const { createPptIngestionWorker } = await import(
    "./ppt-ingestion.worker"
  );
  const { createPptGenerationWorker } = await import(
    "./ppt-generation.worker"
  );
  const { createSlideRenderingWorker } = await import(
    "./slide-rendering.worker"
  );
  const { createAudioScriptGenWorker } = await import(
    "./audio-script-gen.worker"
  );
  workers.push(createPptIngestionWorker());
  workers.push(createPptGenerationWorker());
  workers.push(createSlideRenderingWorker());
  workers.push(createAudioScriptGenWorker());

  // Remotion pipeline workers
  const { createRemotionCompositionWorker } = await import(
    "./remotion-composition.worker"
  );
  const { createRemotionRenderWorker } = await import(
    "./remotion-render.worker"
  );
  workers.push(createRemotionCompositionWorker());
  workers.push(createRemotionRenderWorker());

  // Motion Canvas pipeline workers
  const { createMotionCanvasSceneWorker } = await import(
    "./motion-canvas-scene.worker"
  );
  const { createMotionCanvasRenderWorker } = await import(
    "./motion-canvas-render.worker"
  );
  workers.push(createMotionCanvasSceneWorker());
  workers.push(createMotionCanvasRenderWorker());

  // Scheduled maintenance workers
  const { createBonusExpiryWorker } = await import(
    "./bonus-expiry.worker"
  );
  const { createDailySummaryWorker } = await import(
    "./daily-summary.worker"
  );
  const { createCreditAlertWorker } = await import(
    "./credit-alert.worker"
  );
  workers.push(createBonusExpiryWorker());
  workers.push(createDailySummaryWorker());
  workers.push(createCreditAlertWorker());

  console.warn(`[Workers] ${workers.length} workers initialized`);
}

export async function shutdownWorkers(): Promise<void> {
  console.warn("[Workers] Shutting down workers...");
  await Promise.all(workers.map((w) => w.close()));
  console.warn("[Workers] All workers shut down");
}

export function getWorkers(): Closeable[] {
  return workers;
}

export function registerWorker(worker: Closeable): void {
  workers.push(worker);
  console.warn(`[Workers] Registered worker: ${worker.name}`);
}
