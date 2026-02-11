import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { promptTypeEnum } from "./enums";

export const promptTemplates = pgTable(
  "prompt_templates",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: promptTypeEnum("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    content: text("content").notNull(),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: text("created_by").references(() => user.id),
    variables: jsonb("variables").$type<string[]>().default([]),
    outputSchemaHint: jsonb("output_schema_hint"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("prompt_templates_type_idx").on(table.type),
    index("prompt_templates_created_by_idx").on(table.createdBy),
    index("prompt_templates_type_created_by_active_idx").on(
      table.type,
      table.createdBy,
      table.isActive
    ),
    index("prompt_templates_type_version_idx").on(table.type, table.version),
  ]
);
