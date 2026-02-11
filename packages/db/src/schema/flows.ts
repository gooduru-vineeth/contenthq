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

/** Inline flow types to avoid cross-package dependency in DB schema */
export type FlowNodeType =
  | "input"
  | "output"
  | "agent"
  | "builtin"
  | "condition"
  | "parallelFanOut"
  | "parallelFanIn"
  | "delay";

export interface FlowNodeData {
  [key: string]: unknown;
  label: string;
  nodeType: FlowNodeType;
}

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
}
export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
}
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
export interface FlowConfig {
  autoAdvance?: boolean;
  parallelScenes?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export const flows = pgTable(
  "flows",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),

    // Flow definition (React Flow format)
    flowData: jsonb("flow_data").$type<FlowData>().notNull(),

    // Configuration
    config: jsonb("config").$type<FlowConfig>(),

    version: integer("version").default(1),
    status: text("status", { enum: ["active", "inactive", "draft"] }).default(
      "active"
    ),
    isDefault: boolean("is_default").default(false),

    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("flows_slug_idx").on(table.slug),
    index("flows_status_idx").on(table.status),
  ]
);
