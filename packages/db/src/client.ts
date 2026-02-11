import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import pg from "pg";
import * as schema from "./schema";

export { sql };

const url = new URL(process.env.DATABASE_URL!);

const pool = new pg.Pool({
  host: url.hostname,
  port: Number(url.port) || 5432,
  database: url.pathname.slice(1),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  ssl: url.searchParams.get("sslmode") ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
