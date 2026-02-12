import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const mediaConversations = pgTable("media_conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title"),
  initialPrompt: text("initial_prompt").notNull(),
  model: text("model").notNull(),
  mediaType: text("media_type").notNull().default("image"),
  messageCount: integer("message_count").notNull().default(1),
  lastMessageAt: timestamp("last_message_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type MediaConversation = typeof mediaConversations.$inferSelect;
export type NewMediaConversation = typeof mediaConversations.$inferInsert;
