import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const creditAlertTypeEnum = pgEnum("credit_alert_type", [
  "low_balance",
  "balance_depleted",
  "bonus_expiring",
  "bonus_expired",
]);

export const creditAlerts = pgTable(
  "credit_alerts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: creditAlertTypeEnum("type").notNull(),
    threshold: integer("threshold"),
    currentBalance: integer("current_balance"),
    notified: boolean("notified").default(false),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    resolved: boolean("resolved").default(false),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_alerts_user_id_idx").on(table.userId),
    index("credit_alerts_type_idx").on(table.type),
    index("credit_alerts_resolved_idx").on(table.resolved),
  ]
);
