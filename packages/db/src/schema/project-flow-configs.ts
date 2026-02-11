import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { flows } from "./flows";

export const projectFlowConfigs = pgTable("project_flow_configs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  projectId: text("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  flowId: text("flow_id")
    .notNull()
    .references(() => flows.id, { onDelete: "cascade" }),

  // Per-node agent/config overrides
  nodeOverrides: jsonb("node_overrides"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
