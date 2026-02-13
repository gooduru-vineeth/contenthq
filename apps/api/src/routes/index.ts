import { Hono } from "hono";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";
import { uploadRoutes } from "./upload";
import { voiceCloneUploadRoutes } from "./voice-clone-upload";
import { referenceUploadRoutes } from "./reference-upload";

const routes = new Hono();

routes.route("/health", healthRoutes);
routes.route("/auth", authRoutes);
routes.route("/api/upload", uploadRoutes);
routes.route("/api/voice-clone-upload", voiceCloneUploadRoutes);
routes.route("/api/reference-upload", referenceUploadRoutes);

export { routes };
