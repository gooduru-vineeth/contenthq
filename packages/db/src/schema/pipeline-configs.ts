import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { user } from "./users";

export const pipelineConfigs = pgTable(
  "pipeline_configs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" })
      .unique(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mode: text("mode").notNull().default("simple"),
    stageConfigs: jsonb("stage_configs")
      .$type<Record<string, unknown>>()
      .default({}),
    frozenConfig: jsonb("frozen_config").$type<Record<string, unknown>>(),
    frozenAt: timestamp("frozen_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pipeline_configs_project_id_idx").on(table.projectId),
    index("pipeline_configs_user_id_idx").on(table.userId),
  ]
);
