import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { aiModels } from "./ai-models";
import { promptTemplates } from "./prompt-templates";

export const agents = pgTable(
  "agents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),

    // What this agent does
    agentType: text("agent_type").notNull(),
    // "llm_text" | "llm_structured" | "image_generation" | "vision_verification" | "custom"

    // Model config (references DB-managed model)
    aiModelId: text("ai_model_id").references(() => aiModels.id, {
      onDelete: "set null",
    }),
    modelConfig: jsonb("model_config").$type<{
      temperature?: number;
      maxTokens?: number;
      topP?: number;
    }>(),

    // Prompt config
    promptTemplateId: text("prompt_template_id").references(
      () => promptTemplates.id,
      { onDelete: "set null" }
    ),
    systemPrompt: text("system_prompt"),

    // Output config
    outputConfig: jsonb("output_config").$type<{
      outputType: "text" | "object" | "array";
      schemaName?: string;
      schemaJson?: Record<string, unknown>;
    }>(),

    // Default persona selections
    personaSelections: jsonb("persona_selections")
      .$type<Record<string, string>>()
      .default({}),

    // Variables this agent expects
    expectedVariables: jsonb("expected_variables")
      .$type<string[]>()
      .default([]),

    // Status & metadata
    status: text("status", { enum: ["active", "inactive", "draft"] }).default(
      "active"
    ),
    version: integer("version").notNull().default(1),
    isDefault: boolean("is_default").default(false),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("agents_slug_idx").on(table.slug),
    index("agents_agent_type_idx").on(table.agentType),
    index("agents_status_idx").on(table.status),
  ]
);
