import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";
import { projectStatusEnum } from "./enums";

export const projects = pgTable("projects", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  title: text("title").notNull(),
  status: projectStatusEnum("status").notNull().default("draft"),
  inputType: text("input_type"),
  inputContent: text("input_content"),
  aspectRatio: text("aspect_ratio").default("16:9"),
  targetDuration: integer("target_duration").default(60),
  tone: text("tone").default("professional"),
  language: text("language").default("en"),
  voiceProfileId: text("voice_profile_id"),
  musicTrackId: text("music_track_id"),
  finalVideoUrl: text("final_video_url"),
  thumbnailUrl: text("thumbnail_url"),
  progressPercent: integer("progress_percent").default(0),
  totalCreditsUsed: integer("total_credits_used").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
