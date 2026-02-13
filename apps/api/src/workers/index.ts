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
