import { db } from "@contenthq/db/client";
import { speechGenerations } from "@contenthq/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { addSpeechGenerationJob } from "@contenthq/queue";
import type { SpeechGenerationJobData } from "@contenthq/queue";
import { storage, getSpeechGenerationPath, getAudioContentType } from "@contenthq/storage";
import { truncateForLog, formatFileSize } from "@contenthq/ai";

interface CreateInput {
  text: string;
  provider: string;
  voiceId: string;
  model?: string;
  title?: string;
  projectId?: string;
  voiceSettings?: Record<string, unknown>;
  audioFormat?: string;
}

interface BatchInput {
  text: string;
  title?: string;
  projectId?: string;
  generations: Array<{
    provider: string;
    voiceId: string;
    model?: string;
    voiceSettings?: Record<string, unknown>;
  }>;
}

interface ListFilters {
  status?: string;
  provider?: string;
  projectId?: string;
  batchId?: string;
  limit?: number;
  offset?: number;
}

class SpeechGenerationService {
  async createGeneration(input: CreateInput, userId: string) {
    const [generation] = await db
      .insert(speechGenerations)
      .values({
        userId,
        projectId: input.projectId ?? null,
        title: input.title ?? null,
        inputText: input.text,
        provider: input.provider,
        model: input.model ?? null,
        voiceId: input.voiceId,
        voiceSettings: input.voiceSettings ?? null,
        audioFormat: input.audioFormat ?? "mp3",
        status: "pending",
        progress: 0,
      })
      .returning();

    const jobData: SpeechGenerationJobData = {
      speechGenerationId: generation.id,
      userId,
      projectId: input.projectId,
      text: input.text,
      provider: input.provider,
      model: input.model,
      voiceId: input.voiceId,
      voiceSettings: input.voiceSettings,
    };

    await addSpeechGenerationJob(jobData);
    return generation;
  }

  async createBatch(input: BatchInput, userId: string) {
    const batchId = crypto.randomUUID();

    const results = await Promise.all(
      input.generations.map(async (gen) => {
        const [generation] = await db
          .insert(speechGenerations)
          .values({
            userId,
            projectId: input.projectId ?? null,
            title: input.title ?? null,
            inputText: input.text,
            provider: gen.provider,
            model: gen.model ?? null,
            voiceId: gen.voiceId,
            voiceSettings: gen.voiceSettings ?? null,
            audioFormat: "mp3",
            status: "pending",
            progress: 0,
            batchId,
          })
          .returning();

        const jobData: SpeechGenerationJobData = {
          speechGenerationId: generation.id,
          userId,
          projectId: input.projectId,
          text: input.text,
          provider: gen.provider,
          model: gen.model,
          voiceId: gen.voiceId,
          voiceSettings: gen.voiceSettings,
        };

        await addSpeechGenerationJob(jobData);
        return generation;
      })
    );

    return { batchId, generations: results };
  }

  async processGeneration(speechGenerationId: string) {
    // Update status to processing
    await db
      .update(speechGenerations)
      .set({ status: "processing", progress: 10, updatedAt: new Date() })
      .where(eq(speechGenerations.id, speechGenerationId));

    const [generation] = await db
      .select()
      .from(speechGenerations)
      .where(eq(speechGenerations.id, speechGenerationId));

    if (!generation) {
      throw new Error(`Speech generation not found: ${speechGenerationId}`);
    }

    console.warn(`[SpeechGenService] Processing generation ${speechGenerationId}: provider=${generation.provider}, voiceId=${generation.voiceId}, model=${generation.model ?? "default"}, textLength=${generation.inputText.length}, format=${generation.audioFormat ?? "mp3"}, text="${truncateForLog(generation.inputText, 200)}"`);

    try {
      // Dynamic import to avoid requiring TTS package at startup
      const { getTTSProviderService } = await import("@contenthq/tts");
      const ttsService = getTTSProviderService();

      await db
        .update(speechGenerations)
        .set({ progress: 30, updatedAt: new Date() })
        .where(eq(speechGenerations.id, speechGenerationId));

      const result = await ttsService.generateAudio(
        {
          text: generation.inputText,
          voiceId: generation.voiceId,
          format: (generation.audioFormat as "mp3" | "wav" | "opus") || "mp3",
          speed: (generation.voiceSettings as Record<string, unknown>)
            ?.speed as number | undefined,
          pitch: (generation.voiceSettings as Record<string, unknown>)
            ?.pitch as number | undefined,
          languageCode: (generation.voiceSettings as Record<string, unknown>)
            ?.language as string | undefined,
          ttsSettings: {
            model: generation.model as
              | "tts-1"
              | "tts-1-hd"
              | "gpt-4o-mini-tts"
              | undefined,
            instructions: (
              generation.voiceSettings as Record<string, unknown>
            )?.instructions as string | undefined,
          },
        },
        generation.provider as
          | "openai"
          | "elevenlabs"
          | "google"
          | "google-gemini"
          | "inworld"
          | "sarvam"
      );

      console.warn(`[SpeechGenService] TTS result for ${speechGenerationId}: provider=${generation.provider}, voiceId=${generation.voiceId}, duration=${result.duration}s, format=${result.format}, fileSize=${formatFileSize(result.audioBuffer.length)}, estimatedCost=${result.estimatedCost ?? "N/A"}`);

      await db
        .update(speechGenerations)
        .set({ progress: 70, updatedAt: new Date() })
        .where(eq(speechGenerations.id, speechGenerationId));

      // Upload audio to R2
      const audioKey = getSpeechGenerationPath(generation.userId, speechGenerationId, `audio.${result.format}`);
      const uploadResult = await storage.uploadFile(audioKey, result.audioBuffer, getAudioContentType(result.format));
      const audioUrl = uploadResult.url;

      console.warn(`[SpeechGenService] Uploaded audio for ${speechGenerationId}: storageKey=${audioKey}, fileSize=${formatFileSize(result.audioBuffer.length)}`);

      const durationMs = Math.round(result.duration * 1000);
      const fileSizeBytes = result.audioBuffer.length;
      const costUsd = result.estimatedCost?.toString() ?? null;

      await db
        .update(speechGenerations)
        .set({
          status: "completed",
          progress: 100,
          audioFileUrl: audioUrl,
          audioFileKey: audioKey,
          audioFormat: result.format,
          durationMs,
          fileSizeBytes,
          costUsd,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(speechGenerations.id, speechGenerationId));

      return {
        success: true,
        speechGenerationId,
        duration: result.duration,
        format: result.format,
        provider: generation.provider,
      };
    } catch (error) {
      console.error(`[SpeechGenService] Failed generation ${speechGenerationId}: provider=${generation.provider}, voiceId=${generation.voiceId}, error:`, error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await db
        .update(speechGenerations)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(speechGenerations.id, speechGenerationId));
      throw error;
    }
  }

  async getById(id: string, userId: string) {
    const [generation] = await db
      .select()
      .from(speechGenerations)
      .where(
        and(eq(speechGenerations.id, id), eq(speechGenerations.userId, userId))
      );

    if (!generation) {
      throw new Error("Speech generation not found");
    }

    return generation;
  }

  async list(userId: string, filters: ListFilters = {}) {
    const conditions = [eq(speechGenerations.userId, userId)];

    if (filters.status) {
      conditions.push(
        eq(
          speechGenerations.status,
          filters.status as
            | "pending"
            | "processing"
            | "completed"
            | "failed"
        )
      );
    }
    if (filters.provider) {
      conditions.push(eq(speechGenerations.provider, filters.provider));
    }
    if (filters.projectId) {
      conditions.push(eq(speechGenerations.projectId, filters.projectId));
    }
    if (filters.batchId) {
      conditions.push(eq(speechGenerations.batchId, filters.batchId));
    }

    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const results = await db
      .select()
      .from(speechGenerations)
      .where(and(...conditions))
      .orderBy(desc(speechGenerations.createdAt))
      .limit(limit)
      .offset(offset);

    return results;
  }

  async listByBatch(batchId: string, userId: string) {
    return db
      .select()
      .from(speechGenerations)
      .where(
        and(
          eq(speechGenerations.batchId, batchId),
          eq(speechGenerations.userId, userId)
        )
      )
      .orderBy(desc(speechGenerations.createdAt));
  }

  async retry(id: string, userId: string) {
    const generation = await this.getById(id, userId);

    if (generation.status !== "failed") {
      throw new Error("Can only retry failed generations");
    }

    await db
      .update(speechGenerations)
      .set({
        status: "pending",
        progress: 0,
        errorMessage: null,
        retryCount: generation.retryCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(speechGenerations.id, id));

    const jobData: SpeechGenerationJobData = {
      speechGenerationId: id,
      userId,
      projectId: generation.projectId ?? undefined,
      text: generation.inputText,
      provider: generation.provider,
      model: generation.model ?? undefined,
      voiceId: generation.voiceId,
      voiceSettings:
        (generation.voiceSettings as Record<string, unknown>) ?? undefined,
    };

    await addSpeechGenerationJob(jobData);
    return this.getById(id, userId);
  }

  async edit(
    id: string,
    userId: string,
    updates: {
      text?: string;
      provider?: string;
      voiceId?: string;
      model?: string;
      voiceSettings?: Record<string, unknown>;
      audioFormat?: string;
    }
  ) {
    const original = await this.getById(id, userId);

    const [newGeneration] = await db
      .insert(speechGenerations)
      .values({
        userId,
        projectId: original.projectId,
        title: original.title,
        inputText: updates.text ?? original.inputText,
        provider: updates.provider ?? original.provider,
        model: updates.model ?? original.model,
        voiceId: updates.voiceId ?? original.voiceId,
        voiceSettings:
          updates.voiceSettings ??
          (original.voiceSettings as Record<string, unknown>),
        audioFormat: updates.audioFormat ?? original.audioFormat ?? "mp3",
        status: "pending",
        progress: 0,
        parentGenerationId: id,
        batchId: original.batchId,
      })
      .returning();

    const jobData: SpeechGenerationJobData = {
      speechGenerationId: newGeneration.id,
      userId,
      projectId: original.projectId ?? undefined,
      text: newGeneration.inputText,
      provider: newGeneration.provider,
      model: newGeneration.model ?? undefined,
      voiceId: newGeneration.voiceId,
      voiceSettings:
        (newGeneration.voiceSettings as Record<string, unknown>) ?? undefined,
    };

    await addSpeechGenerationJob(jobData);
    return newGeneration;
  }

  async delete(id: string, userId: string) {
    await this.getById(id, userId);
    await db
      .delete(speechGenerations)
      .where(
        and(eq(speechGenerations.id, id), eq(speechGenerations.userId, userId))
      );
    return { success: true };
  }

  async getProviders() {
    try {
      const { getTTSProviderService, TTS_PROVIDER_CAPABILITIES } =
        await import("@contenthq/tts");
      const service = getTTSProviderService();
      const available = service.getAvailableProviders();
      return available.map((p) => ({
        provider: p.provider,
        enabled: p.enabled,
        capabilities: TTS_PROVIDER_CAPABILITIES[p.provider],
      }));
    } catch {
      return [];
    }
  }

  async getVoices(provider?: string, language?: string) {
    try {
      const { getTTSProviderService } = await import("@contenthq/tts");
      const service = getTTSProviderService();
      if (provider) {
        return service.getVoicesByProvider(
          provider as
            | "openai"
            | "elevenlabs"
            | "google"
            | "google-gemini"
            | "inworld"
            | "sarvam",
          language
        );
      }
      return service.getVoices(language);
    } catch {
      return [];
    }
  }

  async estimateCost(text: string, provider: string, voiceId: string) {
    try {
      const { getTTSProviderService } = await import("@contenthq/tts");
      const service = getTTSProviderService();
      return service.estimateCost(
        { textLength: text.length, voiceId },
        provider as
          | "openai"
          | "elevenlabs"
          | "google"
          | "google-gemini"
          | "inworld"
          | "sarvam"
      );
    } catch {
      return {
        provider,
        estimatedCost: 0,
        characterCount: text.length,
        ratePerCharacter: 0,
      };
    }
  }
}

export const speechGenerationService = new SpeechGenerationService();
