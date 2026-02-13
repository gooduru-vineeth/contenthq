import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { user } from "./users";
import { mediaAssets } from "./media-assets";

export const pipelineMediaOverrides = pgTable(
  "pipeline_media_overrides",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    sceneIndex: integer("scene_index"),
    overrideType: text("override_type").notNull(),
    mediaAssetId: text("media_asset_id").references(() => mediaAssets.id, {
      onDelete: "set null",
    }),
    url: text("url"),
    storageKey: text("storage_key"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("pipeline_media_overrides_project_id_idx").on(table.projectId),
    index("pipeline_media_overrides_stage_idx").on(
      table.projectId,
      table.stage
    ),
  ]
);
