import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { stories } from "./stories";
import { projects } from "./projects";
import { sceneStatusEnum } from "./enums";

export const scenes = pgTable(
  "scenes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    storyId: text("story_id")
      .references(() => stories.id, { onDelete: "cascade" }),
    scriptId: text("script_id"),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    index: integer("index").notNull(),
    status: sceneStatusEnum("status").notNull().default("outlined"),
    visualDescription: text("visual_description"),
    imagePrompt: text("image_prompt"),
    narrationScript: text("narration_script"),
    motionSpec: jsonb("motion_spec"),
    transitions: text("transitions"),
    duration: real("duration"),
    audioDuration: real("audio_duration"),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("scenes_story_id_idx").on(table.storyId),
    index("scenes_project_id_idx").on(table.projectId),
    index("scenes_project_id_index_idx").on(table.projectId, table.index),
  ]
);
