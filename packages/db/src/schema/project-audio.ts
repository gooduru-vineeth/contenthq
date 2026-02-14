import {
  index,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectAudio = pgTable(
  "project_audio",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    scriptId: text("script_id"),
    audioUrl: text("audio_url"),
    storageKey: text("storage_key"),
    durationSec: real("duration_sec"),
    format: text("format").default("mp3"),
    ttsProvider: text("tts_provider"),
    ttsVoiceId: text("tts_voice_id"),
    ttsModel: text("tts_model"),
    mixedAudioUrl: text("mixed_audio_url"),
    mixedAudioStorageKey: text("mixed_audio_storage_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("project_audio_project_id_unique").on(table.projectId),
    index("project_audio_project_id_idx").on(table.projectId),
  ]
);
