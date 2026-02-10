import { publicProcedure, router } from "../trpc";
import { db } from "@contenthq/db/client";
import { sql } from "drizzle-orm";

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: "ok" as const, database: "connected" as const };
    } catch {
      return { status: "error" as const, database: "disconnected" as const };
    }
  }),
});
