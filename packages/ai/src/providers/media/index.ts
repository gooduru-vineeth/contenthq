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
import { falMediaProvider } from "./fal.provider";
import { googleVideoProvider } from "./google-video.provider";

mediaProviderRegistry.register(openaiImageProvider);
mediaProviderRegistry.register(replicateMediaProvider);
mediaProviderRegistry.register(falMediaProvider);
mediaProviderRegistry.register(googleVideoProvider);
