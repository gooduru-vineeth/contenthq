import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { scenes } from "./scenes";

export const sceneAudioMixes = pgTable("scene_audio_mixes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sceneId: text("scene_id")
    .notNull()
    .references(() => scenes.id),
  mixedAudioUrl: text("mixed_audio_url"),
  voiceoverVolume: integer("voiceover_volume").default(100),
  musicVolume: integer("music_volume").default(30),
  musicDuckingEnabled: boolean("music_ducking_enabled").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
