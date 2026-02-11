import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { aiProviderTypeEnum } from "./enums";

export const aiProviders = pgTable("ai_providers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: aiProviderTypeEnum("type").notNull(),
  isEnabled: boolean("is_enabled").default(true),
  rateLimitPerMinute: integer("rate_limit_per_minute"),
  costPerUnit: numeric("cost_per_unit"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
