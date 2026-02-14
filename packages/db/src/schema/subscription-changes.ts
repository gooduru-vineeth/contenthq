import { index, jsonb, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { subscriptions } from "./subscriptions";
import { user } from "./users";

export const subscriptionChangeTypeEnum = pgEnum("subscription_change_type", [
  "created",
  "upgraded",
  "downgraded",
  "cancelled",
  "reactivated",
]);

export const subscriptionChanges = pgTable(
  "subscription_changes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    changeType: subscriptionChangeTypeEnum("change_type").notNull(),
    fromPlanId: text("from_plan_id"),
    toPlanId: text("to_plan_id"),

    reason: text("reason"),
    effectiveDate: timestamp("effective_date").notNull(),

    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("subscription_changes_subscription_id_idx").on(table.subscriptionId),
    index("subscription_changes_user_id_idx").on(table.userId),
  ]
);
