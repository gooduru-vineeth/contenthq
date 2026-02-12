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
import { mediaTypeEnum, mediaGenerationStatusEnum } from "./enums";

export const generatedMedia = pgTable(
  "generated_media",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversation_id"),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    mediaType: mediaTypeEnum("media_type").notNull().default("image"),
    prompt: text("prompt").notNull(),
    revisedPrompt: text("revised_prompt"),
    mediaUrl: text("media_url"),
    storageKey: text("storage_key"),
    model: text("model").notNull(),
    provider: text("provider").notNull(),
    aspectRatio: text("aspect_ratio").notNull().default("1:1"),
    quality: text("quality").notNull().default("standard"),
    style: text("style"),
    width: integer("width"),
    height: integer("height"),
    duration: integer("duration"),
    fileSize: integer("file_size"),
    mimeType: text("mime_type").default("image/png"),
    generationTimeMs: integer("generation_time_ms"),
    status: mediaGenerationStatusEnum("status").notNull().default("pending"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    flowExecutionId: text("flow_execution_id"),
    flowNodeId: text("flow_node_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("generated_media_user_id_idx").on(table.userId),
    index("generated_media_conversation_id_idx").on(table.conversationId),
    index("generated_media_project_id_idx").on(table.projectId),
    index("generated_media_status_idx").on(table.status),
    index("generated_media_created_at_idx").on(table.createdAt),
  ]
);

export type GeneratedMedia = typeof generatedMedia.$inferSelect;
export type NewGeneratedMedia = typeof generatedMedia.$inferInsert;
