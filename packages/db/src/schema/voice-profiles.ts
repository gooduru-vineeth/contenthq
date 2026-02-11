import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const voiceProfiles = pgTable("voice_profiles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  providerVoiceId: text("provider_voice_id").notNull(),
  voiceId: text("voice_id").notNull(),
  language: text("language"),
  gender: text("gender"),
  previewUrl: text("preview_url"),
  config: jsonb("config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
