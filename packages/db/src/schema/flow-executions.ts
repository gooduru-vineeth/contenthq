import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { flows } from "./flows";
import { projects } from "./projects";
import { user } from "./users";

import type { FlowNodeType } from "./flows";

/** Inline type to avoid cross-package dependency in DB schema */
export interface FlowNodeLogEntry {
  nodeId: string;
  nodeType: FlowNodeType;
  status: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
}

export const flowExecutions = pgTable(
  "flow_executions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    flowId: text("flow_id")
      .notNull()
      .references(() => flows.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    status: text("status", {
      enum: ["pending", "running", "completed", "failed", "cancelled"],
    })
      .notNull()
      .default("pending"),
    currentNodeId: text("current_node_id"),

    nodeLog: jsonb("node_log").$type<FlowNodeLogEntry[]>().default([]),
    inputData: jsonb("input_data"),
    outputData: jsonb("output_data"),
    errorMessage: text("error_message"),

    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    durationMs: integer("duration_ms"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("flow_executions_flow_id_idx").on(table.flowId),
    index("flow_executions_project_id_idx").on(table.projectId),
    index("flow_executions_status_idx").on(table.status),
  ]
);
