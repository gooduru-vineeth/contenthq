import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const clonedVoices = pgTable(
  "cloned_voices",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    language: text("language").notNull(),
    providerVoiceId: text("provider_voice_id"),
    providerVoiceName: text("provider_voice_name"),
    status: text("status", {
      enum: ["pending", "processing", "ready", "failed"],
    })
      .notNull()
      .default("pending"),
    tags: jsonb("tags").$type<string[]>(),
    removeBackgroundNoise: text("remove_background_noise").default("false"),
    validationResults: jsonb("validation_results").$type<
      Array<{
        langCode: string;
        warnings: string[];
        errors: string[];
        transcription: string;
      }>
    >(),
    errorMessage: text("error_message"),
    previewUrl: text("preview_url"),
    config: jsonb("config"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("cloned_voices_user_id_idx").on(table.userId),
    index("cloned_voices_status_idx").on(table.status),
  ]
);
