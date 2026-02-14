import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { pipelineTemplates } from "./pipeline-templates";
import { pipelineRunStatusEnum } from "./enums";

export const pipelineRuns = pgTable(
  "pipeline_runs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    templateId: text("template_id")
      .references(() => pipelineTemplates.id, { onDelete: "set null" }),
    /** For built-in templates, store the template slug directly */
    templateSlug: text("template_slug"),
    status: pipelineRunStatusEnum("status").notNull().default("pending"),
    frozenConfig: jsonb("frozen_config").$type<Record<string, unknown>>(),
    currentStageId: text("current_stage_id"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pipeline_runs_project_id_idx").on(table.projectId),
    index("pipeline_runs_status_idx").on(table.status),
  ]
);
