export type {
  MediaGenerationProvider,
  ImageProviderOptions,
  VideoProviderOptions,
  ImageEditOptions,
  ProviderMediaResult,
} from "./types";
export { mediaProviderRegistry } from "./registry";

import { mediaProviderRegistry } from "./registry";
import { openaiImageProvider } from "./openai-image.provider";
import { replicateMediaProvider } from "./replicate.provider";
import { falVideoProvider } from "./fal.provider";
import { googleVideoProvider } from "./google-video.provider";

mediaProviderRegistry.register(openaiImageProvider);
mediaProviderRegistry.register(replicateMediaProvider);
mediaProviderRegistry.register(falVideoProvider);
mediaProviderRegistry.register(googleVideoProvider);
