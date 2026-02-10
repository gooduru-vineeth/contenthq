import { Hono } from "hono";
import { logger } from "hono/logger";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error";
import { routes } from "./routes";
import { appRouter } from "./trpc/routers";
import { createContext } from "./trpc/context";

const app = new Hono();

app.use("*", logger());
app.use("*", corsMiddleware);
app.onError(errorHandler);

app.use("/trpc/*", async (c) => {
  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
  return response;
});

app.route("/", routes);

export { app };
