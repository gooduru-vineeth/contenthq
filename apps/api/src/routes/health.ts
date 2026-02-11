import { Hono } from "hono";
import { db, sql } from "@contenthq/db/client";

const healthRoutes = new Hono();

healthRoutes.get("/", async (c) => {
  try {
    await db.execute(sql`SELECT 1`);
    return c.json({ status: "ok", database: "connected" });
  } catch {
    return c.json({ status: "error", database: "disconnected" }, 500);
  }
});

export { healthRoutes };
