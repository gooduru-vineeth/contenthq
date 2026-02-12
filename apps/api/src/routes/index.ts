import { Hono } from "hono";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";
import { uploadRoutes } from "./upload";

const routes = new Hono();

routes.route("/health", healthRoutes);
routes.route("/auth", authRoutes);
routes.route("/api/upload", uploadRoutes);

export { routes };
