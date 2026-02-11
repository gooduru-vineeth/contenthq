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
});

export type AppRouter = typeof appRouter;
