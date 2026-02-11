import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const ingestedContent = pgTable(
  "ingested_content",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url"),
    sourcePlatform: text("source_platform"),
    title: text("title"),
    body: text("body"),
    summary: text("summary"),
    engagementScore: integer("engagement_score").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("ingested_content_project_id_idx").on(table.projectId)]
);
