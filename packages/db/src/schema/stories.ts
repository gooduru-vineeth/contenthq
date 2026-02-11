import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const stories = pgTable(
  "stories",
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
    sceneCount: integer("scene_count").default(0),
    version: integer("version").default(1),
    aiModelUsed: text("ai_model_used"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("stories_project_id_idx").on(table.projectId)]
);
