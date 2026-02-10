import { Hono } from "hono";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";

const routes = new Hono();

routes.route("/health", healthRoutes);
routes.route("/auth", authRoutes);

export { routes };
