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
});

export type AppRouter = typeof appRouter;
