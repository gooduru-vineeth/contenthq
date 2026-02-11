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
import { personaCategoryEnum } from "./enums";

export const personas = pgTable(
  "personas",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    category: personaCategoryEnum("category").notNull(),
    name: text("name").notNull(),
    label: text("label").notNull(),
    description: text("description"),
    promptFragment: text("prompt_fragment").notNull(),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull().default(1),
    isDefault: boolean("is_default").notNull().default(false),
    uiConfig: jsonb("ui_config").$type<{
      gradient?: string;
      icon?: string;
      color?: string;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("personas_category_idx").on(table.category),
    index("personas_created_by_idx").on(table.createdBy),
    index("personas_category_created_by_idx").on(
      table.category,
      table.createdBy
    ),
  ]
);
