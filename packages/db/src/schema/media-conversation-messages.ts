import {
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { mediaConversations } from "./media-conversations";
import { generatedMedia } from "./generated-media";

export type MediaMessageRole = "user" | "assistant";

export const mediaConversationMessages = pgTable(
  "media_conversation_messages",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => mediaConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<MediaMessageRole>(),
    content: text("content").notNull(),
    generatedMediaId: text("generated_media_id").references(
      () => generatedMedia.id,
      { onDelete: "set null" }
    ),
    model: text("model"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  }
);

export type MediaConversationMessage = typeof mediaConversationMessages.$inferSelect;
export type NewMediaConversationMessage = typeof mediaConversationMessages.$inferInsert;
