import { boolean, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { aiProviders } from "./ai-providers";

export const aiModels = pgTable("ai_models", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  providerId: text("provider_id")
    .notNull()
    .references(() => aiProviders.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  modelId: text("model_id").notNull(),
  type: text("type"),
  isDefault: boolean("is_default").default(false),
  costs: jsonb("costs"),
  capabilities: jsonb("capabilities"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
