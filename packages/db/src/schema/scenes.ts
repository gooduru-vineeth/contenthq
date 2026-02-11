import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { stories } from "./stories";
import { projects } from "./projects";
import { sceneStatusEnum } from "./enums";

export const scenes = pgTable("scenes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  storyId: text("story_id")
    .notNull()
    .references(() => stories.id),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id),
  index: integer("index").notNull(),
  status: sceneStatusEnum("status").notNull().default("outlined"),
  visualDescription: text("visual_description"),
  imagePrompt: text("image_prompt"),
  narrationScript: text("narration_script"),
  motionSpec: jsonb("motion_spec"),
  transitions: text("transitions"),
  duration: integer("duration"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
