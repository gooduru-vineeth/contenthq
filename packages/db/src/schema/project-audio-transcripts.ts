import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const projectAudioTranscripts = pgTable(
  "project_audio_transcripts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    projectAudioId: text("project_audio_id").notNull(),
    sttProvider: text("stt_provider").default("groq"),
    sttModel: text("stt_model").default("whisper-large-v3-turbo"),
    words: jsonb("words"),
    segments: jsonb("segments"),
    totalDurationMs: integer("total_duration_ms"),
    wordCount: integer("word_count"),
    confidence: real("confidence"),
    rawResponse: jsonb("raw_response"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    unique("project_audio_transcripts_project_id_unique").on(table.projectId),
    index("project_audio_transcripts_project_id_idx").on(table.projectId),
  ]
);
