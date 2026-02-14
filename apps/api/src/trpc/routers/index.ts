import { router } from "../trpc";
import { healthRouter } from "./health";
import { projectRouter } from "./project";
import { ingestionRouter } from "./ingestion";
import { storyRouter } from "./story";
import { jobRouter } from "./job";
import { sceneRouter } from "./scene";
import { pipelineRouter } from "./pipeline";
import { mediaRouter } from "./media";
import { voiceRouter } from "./voice";
import { musicRouter } from "./music";
import { billingRouter } from "./billing";
import { promptRouter } from "./prompt";
import { adminProviderRouter } from "./admin-providers";
import { adminModelRouter } from "./admin-models";
import { agentRouter } from "./agent";
import { flowRouter } from "./flow";
import { flowExecutionRouter } from "./flow-execution";
import { speechGenerationRouter } from "./speech-generation";
import { mediaGenerationRouter } from "./media-generation";
import { voiceCloneRouter } from "./voice-clone";
import { pipelineConfigRouter } from "./pipeline-config";
import { mediaOverrideRouter } from "./media-override";
import { variationRouter } from "./variation";
import { userModelPreferenceRouter } from "./user-model-preferences";
import { stockMediaRouter } from "./stock-media";
import { adminBillingRouter } from "./admin-billing";
import { adminBonusRouter } from "./admin-bonus";
import { paymentRouter } from "./payment";
import { analyticsRouter } from "./analytics";
import { subscriptionRouter } from "./subscription";
import { adminSubscriptionRouter } from "./admin-subscription";

export const appRouter = router({
  health: healthRouter,
  project: projectRouter,
  ingestion: ingestionRouter,
  story: storyRouter,
  job: jobRouter,
  scene: sceneRouter,
  pipeline: pipelineRouter,
  media: mediaRouter,
  voice: voiceRouter,
  music: musicRouter,
  billing: billingRouter,
  prompt: promptRouter,
  adminProvider: adminProviderRouter,
  adminModel: adminModelRouter,
  agent: agentRouter,
  flow: flowRouter,
  flowExecution: flowExecutionRouter,
  speechGeneration: speechGenerationRouter,
  mediaGeneration: mediaGenerationRouter,
  voiceClone: voiceCloneRouter,
  pipelineConfig: pipelineConfigRouter,
  mediaOverride: mediaOverrideRouter,
  variation: variationRouter,
  userModelPreference: userModelPreferenceRouter,
  stockMedia: stockMediaRouter,
  adminBilling: adminBillingRouter,
  subscription: subscriptionRouter,
  adminSubscription: adminSubscriptionRouter,
  adminBonus: adminBonusRouter,
  payment: paymentRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
