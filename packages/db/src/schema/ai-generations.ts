import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { projects } from "./projects";
import { aiProviders } from "./ai-providers";
import { aiModels } from "./ai-models";
import { promptTemplates } from "./prompt-templates";

export const aiGenerations = pgTable("ai_generations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id),
  projectId: text("project_id").references(() => projects.id),
  providerId: text("provider_id").references(() => aiProviders.id),
  modelId: text("model_id").references(() => aiModels.id),
  type: text("type"),
  input: jsonb("input"),
  output: jsonb("output"),
  tokens: integer("tokens"),
  costUsd: numeric("cost_usd"),
  latencyMs: integer("latency_ms"),
  promptTemplateId: text("prompt_template_id").references(
    () => promptTemplates.id
  ),
  composedPrompt: text("composed_prompt"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
