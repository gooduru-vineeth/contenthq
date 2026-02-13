import { db } from "@contenthq/db/client";
import { clonedVoices, clonedVoiceSamples } from "@contenthq/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { storage, getVoiceCloneSamplePath } from "@contenthq/storage";

interface CreateInput {
  name: string;
  language: string;
  description?: string;
  tags?: string[];
  removeBackgroundNoise?: string;
}

class VoiceCloneService {
  async create(input: CreateInput, userId: string) {
    const [voice] = await db
      .insert(clonedVoices)
      .values({
        userId,
        name: input.name,
        language: input.language,
        description: input.description ?? null,
        tags: input.tags ?? null,
        removeBackgroundNoise: input.removeBackgroundNoise ?? "false",
        status: "pending",
      })
      .returning();

    return voice;
  }

  async processClone(id: string, userId: string) {
    const voice = await this.getById(id, userId);

    await db
      .update(clonedVoices)
      .set({ status: "processing", updatedAt: new Date() })
      .where(eq(clonedVoices.id, id));

    try {
      const samples = await db
        .select()
        .from(clonedVoiceSamples)
        .where(
          and(
            eq(clonedVoiceSamples.clonedVoiceId, id),
            eq(clonedVoiceSamples.userId, userId)
          )
        );

      if (samples.length === 0) {
        throw new Error("No audio samples uploaded for this voice");
      }

      const voiceSamples: Array<{ audioData: string }> = [];
      for (const sample of samples) {
        const buffer = await storage.downloadFile(sample.storageKey);
        voiceSamples.push({ audioData: buffer.toString("base64") });
      }

      const { InworldTTSProvider } = await import("@contenthq/tts");

      const inworldApiKey = process.env.INWORLD_API_KEY;
      const inworldWorkspaceId = process.env.INWORLD_WORKSPACE_ID ?? "";
      if (!inworldApiKey) {
        throw new Error("INWORLD_API_KEY is not configured");
      }

      const provider = new InworldTTSProvider({
        provider: "inworld",
        enabled: true,
        apiKey: inworldApiKey,
        workspaceId: inworldWorkspaceId,
      });

      const result = await provider.cloneVoice({
        displayName: voice.name,
        langCode: voice.language,
        voiceSamples,
        description: voice.description ?? undefined,
        tags: voice.tags ?? undefined,
        audioProcessingConfig: {
          removeBackgroundNoise: voice.removeBackgroundNoise === "true",
        },
      });

      await db
        .update(clonedVoices)
        .set({
          providerVoiceId: result.voice.voiceId,
          providerVoiceName: result.voice.name,
          validationResults: result.audioSamplesValidated,
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(clonedVoices.id, id));

      return {
        success: true,
        voiceId: result.voice.voiceId,
        validationResults: result.audioSamplesValidated,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      await db
        .update(clonedVoices)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(clonedVoices.id, id));
      throw error;
    }
  }

  async list(userId: string) {
    return db
      .select()
      .from(clonedVoices)
      .where(eq(clonedVoices.userId, userId))
      .orderBy(desc(clonedVoices.createdAt));
  }

  async getById(id: string, userId: string) {
    const [voice] = await db
      .select()
      .from(clonedVoices)
      .where(
        and(eq(clonedVoices.id, id), eq(clonedVoices.userId, userId))
      );

    if (!voice) {
      throw new Error("Cloned voice not found");
    }

    return voice;
  }

  async delete(id: string, userId: string) {
    const voice = await this.getById(id, userId);

    const prefix = getVoiceCloneSamplePath(userId, voice.id, "").replace(
      /\/$/,
      ""
    );
    try {
      await storage.deleteDirectory(prefix);
    } catch {
      // Storage cleanup is best-effort
    }

    await db
      .delete(clonedVoices)
      .where(
        and(eq(clonedVoices.id, id), eq(clonedVoices.userId, userId))
      );

    return { success: true };
  }

  async listSamples(clonedVoiceId: string, userId: string) {
    return db
      .select()
      .from(clonedVoiceSamples)
      .where(
        and(
          eq(clonedVoiceSamples.clonedVoiceId, clonedVoiceId),
          eq(clonedVoiceSamples.userId, userId)
        )
      );
  }

  async retry(id: string, userId: string) {
    const voice = await this.getById(id, userId);

    if (voice.status !== "failed") {
      throw new Error("Can only retry failed voice clones");
    }

    await db
      .update(clonedVoices)
      .set({
        status: "pending",
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(clonedVoices.id, id));

    return this.processClone(id, userId);
  }
}

export const voiceCloneService = new VoiceCloneService();
