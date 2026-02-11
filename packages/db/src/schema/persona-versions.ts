import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { personas } from "./personas";
import { personaCategoryEnum } from "./enums";

export const personaVersions = pgTable(
  "persona_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    personaId: text("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    category: personaCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    promptFragment: text("prompt_fragment").notNull(),
    uiConfig: jsonb("ui_config").$type<{
      gradient?: string;
      icon?: string;
      color?: string;
    }>(),
    editedBy: text("edited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("persona_versions_persona_id_idx").on(table.personaId),
    index("persona_versions_persona_id_version_idx").on(
      table.personaId,
      table.version
    ),
  ]
);
