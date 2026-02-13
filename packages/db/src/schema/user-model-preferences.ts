import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./users";
import { aiModels } from "./ai-models";

export const userModelPreferences = pgTable(
  "user_model_preferences",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    purposeType: text("purpose_type").notNull(),
    aiModelId: text("ai_model_id")
      .notNull()
      .references(() => aiModels.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.userId, table.purposeType)]
);
