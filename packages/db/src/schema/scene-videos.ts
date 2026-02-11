import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { scenes } from "./scenes";

export const sceneVideos = pgTable(
  "scene_videos",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sceneId: text("scene_id")
      .notNull()
      .references(() => scenes.id, { onDelete: "cascade" }),
    videoUrl: text("video_url"),
    storageKey: text("storage_key"),
    duration: integer("duration"),
    voiceoverUrl: text("voiceover_url"),
    ttsProvider: text("tts_provider"),
    ttsVoiceId: text("tts_voice_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("scene_videos_scene_id_idx").on(table.sceneId)]
);
