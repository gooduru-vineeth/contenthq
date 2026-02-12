import type {
  MediaModelConfig,
  AvailableMediaModel,
  MediaGenerationType,
} from "@contenthq/shared";
import type {
  MediaGenerationProvider,
  ImageEditOptions,
  ProviderMediaResult,
} from "./types";

class MediaProviderRegistry {
  private providers = new Map<string, MediaGenerationProvider>();

  register(provider: MediaGenerationProvider): void {
    this.providers.set(provider.provider, provider);
  }

  getProvider(providerName: string): MediaGenerationProvider | undefined {
    return this.providers.get(providerName);
  }

  getProviderForModel(modelId: string): MediaGenerationProvider | undefined {
    for (const provider of this.providers.values()) {
      if (provider.getModels().some((m) => m.id === modelId)) {
        return provider;
      }
    }
    return undefined;
  }

  getAllModels(type?: MediaGenerationType): MediaModelConfig[] {
    const models: MediaModelConfig[] = [];
    for (const provider of this.providers.values()) {
      models.push(...provider.getModels(type));
    }
    return models;
  }

  getAvailableModels(type?: MediaGenerationType): AvailableMediaModel[] {
    const result: AvailableMediaModel[] = [];
    for (const provider of this.providers.values()) {
      const configured = provider.isConfigured();
      for (const model of provider.getModels(type)) {
        result.push({
          id: model.id,
          name: model.name,
          provider: model.provider,
          mediaType: model.mediaType,
          available: configured,
          capabilities: {
            supportsStyle: model.supportsStyle,
            supportsMultiple: model.supportsMultiple,
            supportsEditing: model.supportsEditing,
            supportsImageToVideo: model.supportsImageToVideo,
            maxCount: model.maxCount,
            maxDuration: model.maxDuration,
          },
        });
      }
    }
    return result;
  }

  getEditableModels(): AvailableMediaModel[] {
    return this.getAvailableModels().filter(
      (m) => m.available && m.capabilities.supportsEditing
    );
  }

  async edit(options: ImageEditOptions): Promise<ProviderMediaResult> {
    const provider = this.getProviderForModel(options.model);
    if (!provider) {
      throw new Error(`No provider found for model: ${options.model}`);
    }
    if (!provider.supportsEditing(options.model)) {
      throw new Error(`Model ${options.model} does not support editing`);
    }
    if (!provider.editImage) {
      throw new Error(`Provider ${provider.name} does not support editing`);
    }
    return provider.editImage(options);
  }
}

export const mediaProviderRegistry = new MediaProviderRegistry();
