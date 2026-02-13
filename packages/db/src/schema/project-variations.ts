import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { user } from "./users";

export const projectVariations = pgTable(
  "project_variations",
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
    name: text("name").notNull(),
    description: text("description"),
    stageOverrides: jsonb("stage_overrides")
      .$type<Record<string, unknown>>()
      .default({}),
    status: text("status").notNull().default("draft"),
    finalVideoUrl: text("final_video_url"),
    creditsUsed: integer("credits_used").default(0),
    evaluationScores: jsonb("evaluation_scores").$type<
      Record<string, number>
    >(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("project_variations_project_id_idx").on(table.projectId),
    index("project_variations_user_id_idx").on(table.userId),
  ]
);
