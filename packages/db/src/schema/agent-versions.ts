import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { agents } from "./agents";

export const agentVersions = pgTable(
  "agent_versions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    editedBy: text("edited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    changeNote: text("change_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("agent_versions_agent_id_idx").on(table.agentId),
    index("agent_versions_agent_id_version_idx").on(
      table.agentId,
      table.version
    ),
  ]
);
