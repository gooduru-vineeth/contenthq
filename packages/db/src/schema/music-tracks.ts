import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const musicTracks = pgTable("music_tracks", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  name: text("name").notNull(),
  genre: text("genre"),
  category: text("category"),
  mood: text("mood"),
  bpm: integer("bpm"),
  duration: integer("duration"),
  url: text("url"),
  storageKey: text("storage_key"),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
