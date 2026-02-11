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
import { jobStatusEnum } from "./enums";

export const generationJobs = pgTable(
  "generation_jobs",
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
    jobType: text("job_type").notNull(),
    status: jobStatusEnum("status").notNull().default("pending"),
    priority: integer("priority").default(0),
    config: jsonb("config"),
    result: jsonb("result"),
    progressPercent: integer("progress_percent").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("generation_jobs_project_id_idx").on(table.projectId),
    index("generation_jobs_user_id_idx").on(table.userId),
    index("generation_jobs_status_idx").on(table.status),
  ]
);
