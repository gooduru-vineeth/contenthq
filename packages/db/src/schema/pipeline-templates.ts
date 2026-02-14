import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const pipelineTemplates = pgTable("pipeline_templates", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  version: integer("version").notNull().default(1),
  outputType: text("output_type").notNull().default("ai_video"),
  stages: jsonb("stages")
    .$type<Record<string, unknown>[]>()
    .notNull()
    .default([]),
  defaultConfig: jsonb("default_config")
    .$type<Record<string, unknown>>()
    .default({}),
  isBuiltIn: boolean("is_built_in").notNull().default(false),
  createdBy: text("created_by").references(() => user.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
