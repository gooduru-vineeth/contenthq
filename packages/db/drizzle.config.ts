import { defineConfig } from "drizzle-kit";

const url = new URL(process.env.DATABASE_URL!);

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: url.hostname,
    port: Number(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: url.searchParams.has("sslmode") ? "prefer" : false,
  },
});
