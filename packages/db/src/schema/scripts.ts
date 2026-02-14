import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const scripts = pgTable(
  "scripts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    hook: text("hook"),
    synopsis: text("synopsis"),
    narrativeArc: jsonb("narrative_arc"),
    fullScript: text("full_script").notNull(),
    wordCount: integer("word_count"),
    estimatedDurationSec: real("estimated_duration_sec"),
    language: text("language").default("en"),
    version: integer("version").default(1),
    aiModelUsed: text("ai_model_used"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("scripts_project_id_idx").on(table.projectId)]
);
