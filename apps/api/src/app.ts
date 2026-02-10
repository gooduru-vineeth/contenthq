import { Hono } from "hono";
import { logger } from "hono/logger";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error";
import { routes } from "./routes";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);
app.onError(errorHandler);
app.route("/", routes);

export { app };
