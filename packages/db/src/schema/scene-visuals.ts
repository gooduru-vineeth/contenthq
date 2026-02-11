import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { scenes } from "./scenes";

export const sceneVisuals = pgTable("scene_visuals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sceneId: text("scene_id")
    .notNull()
    .references(() => scenes.id),
  imageUrl: text("image_url"),
  storageKey: text("storage_key"),
  prompt: text("prompt"),
  verified: boolean("verified").default(false),
  verificationScore: integer("verification_score"),
  verificationDetails: jsonb("verification_details"),
  retryCount: integer("retry_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
