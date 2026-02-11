import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { promptTemplates } from "./prompt-templates";
import { promptTypeEnum } from "./enums";

export const promptTemplateVersions = pgTable(
  "prompt_template_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    templateId: text("template_id")
      .notNull()
      .references(() => promptTemplates.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    type: promptTypeEnum("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    variables: jsonb("variables").$type<string[]>().default([]),
    outputSchemaHint: jsonb("output_schema_hint"),
    editedBy: text("edited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_template_versions_template_id_idx").on(table.templateId),
    index("prompt_template_versions_template_id_version_idx").on(
      table.templateId,
      table.version
    ),
  ]
);
