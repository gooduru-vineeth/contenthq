import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";
import { projects } from "./projects";
import { mediaTypeEnum } from "./enums";

export const mediaAssets = pgTable("media_assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  projectId: text("project_id").references(() => projects.id),
  type: mediaTypeEnum("type").notNull(),
  url: text("url"),
  storageKey: text("storage_key"),
  mimeType: text("mime_type"),
  sizeBytes: integer("size_bytes"),
  dimensions: jsonb("dimensions"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
