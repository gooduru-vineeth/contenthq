// Service
export { stockMediaService, StockMediaService } from "./stock-media-service";

// Registry
export {
  stockMediaProviderRegistry,
  StockMediaProviderRegistry,
} from "./provider-registry";

// Factory
export {
  initializeStockMediaProviders,
  getProviderConfig,
  getAllProviderConfigs,
  isProviderConfigured,
  getConfiguredProviderIds,
  resetProviderInitialization,
  STOCK_MEDIA_PROVIDERS,
} from "./provider-factory";

// Types
export type {
  StockMediaType,
  MediaOrientation,
  ProviderStatus,
  StockMediaProvider,
  StockMediaSearchOptions,
  StockMediaCuratedOptions,
  NormalizedMediaResult,
  ProviderResultMeta,
  StockMediaSearchResponse,
  StockMediaProviderAdapter,
  StockMediaProviderConfig,
} from "./types";

// Provider adapters
export { BaseStockMediaAdapter } from "./providers/base-adapter";
export { PexelsAdapter } from "./providers/pexels-adapter";
export { UnsplashAdapter } from "./providers/unsplash-adapter";
export { PixabayAdapter } from "./providers/pixabay-adapter";
export { StoryblocksAdapter } from "./providers/storyblocks-adapter";
