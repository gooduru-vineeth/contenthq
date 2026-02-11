import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectPromptConfigs = pgTable("project_prompt_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" })
    .unique(),
  promptOverrides: jsonb("prompt_overrides")
    .$type<Record<string, string>>()
    .default({}),
  personaSelections: jsonb("persona_selections")
    .$type<Record<string, string>>()
    .default({}),
  customVariables: jsonb("custom_variables")
    .$type<Record<string, string>>()
    .default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
