import { Hono } from "hono";
import { auth } from "../lib/auth";

const authRoutes = new Hono();

authRoutes.on(["GET", "POST"], "/**", async (c) => {
  try {
    return await auth.handler(c.req.raw);
  } catch (error) {
    console.error("[Auth] Handler error:", error);
    return c.json(
      {
        error: "Authentication service error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500,
      { "Content-Type": "application/json" }
    );
  }
});

export { authRoutes };
