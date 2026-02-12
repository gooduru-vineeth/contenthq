import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { projects } from "./projects";

export const speechGenerations = pgTable(
  "speech_generations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    title: text("title"),
    inputText: text("input_text").notNull(),

    provider: text("provider").notNull(),
    model: text("model"),
    voiceId: text("voice_id").notNull(),
    voiceSettings: jsonb("voice_settings").$type<Record<string, unknown>>(),

    status: text("status", {
      enum: ["pending", "processing", "completed", "failed"],
    })
      .notNull()
      .default("pending"),
    progress: integer("progress").notNull().default(0),

    audioFileUrl: text("audio_file_url"),
    audioFileKey: text("audio_file_key"),
    audioFormat: text("audio_format"),
    durationMs: integer("duration_ms"),
    fileSizeBytes: integer("file_size_bytes"),
    costUsd: text("cost_usd"),

    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),

    parentGenerationId: text("parent_generation_id"),
    batchId: text("batch_id"),

    flowExecutionId: text("flow_execution_id"),
    flowNodeId: text("flow_node_id"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
  },
  (table) => [
    index("speech_generations_user_id_idx").on(table.userId),
    index("speech_generations_project_id_idx").on(table.projectId),
    index("speech_generations_status_idx").on(table.status),
    index("speech_generations_batch_id_idx").on(table.batchId),
  ]
);
