import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";
import { clonedVoices } from "./cloned-voices";

export const clonedVoiceSamples = pgTable(
  "cloned_voice_samples",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    clonedVoiceId: text("cloned_voice_id")
      .notNull()
      .references(() => clonedVoices.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    storageKey: text("storage_key").notNull(),
    url: text("url"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes"),
    transcription: text("transcription"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("cloned_voice_samples_cloned_voice_id_idx").on(table.clonedVoiceId),
    index("cloned_voice_samples_user_id_idx").on(table.userId),
  ]
);
