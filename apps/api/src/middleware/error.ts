import type { ErrorHandler } from "hono";
import * as Sentry from "@sentry/node";

export const errorHandler: ErrorHandler = (err, c) => {
  Sentry.captureException(err, {
    extra: {
      method: c.req.method,
      url: c.req.url,
      path: c.req.path,
    },
  });
  console.error(`[Error] ${err.message}`);
  return c.json({ error: err.message || "Internal Server Error" }, 500);
};
