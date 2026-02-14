import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { pipelineRuns } from "./pipeline-runs";
import { pipelineRunStageStatusEnum } from "./enums";

export const pipelineRunStages = pgTable(
  "pipeline_run_stages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    runId: text("run_id")
      .notNull()
      .references(() => pipelineRuns.id, { onDelete: "cascade" }),
    stageId: text("stage_id").notNull(),
    status: pipelineRunStageStatusEnum("status").notNull().default("pending"),
    jobCount: integer("job_count").notNull().default(0),
    completedJobs: integer("completed_jobs").notNull().default(0),
    failedJobs: integer("failed_jobs").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pipeline_run_stages_run_id_idx").on(table.runId),
    index("pipeline_run_stages_stage_id_idx").on(table.stageId),
    index("pipeline_run_stages_run_id_stage_id_idx").on(
      table.runId,
      table.stageId
    ),
  ]
);
