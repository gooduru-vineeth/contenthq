import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { subscriptionPlans } from "./subscription-plans";

// Subscription status enum
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "cancelled",
  "expired",
]);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    planId: text("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id),

    status: subscriptionStatusEnum("status").notNull().default("active"),

    // Period tracking
    currentPeriodStart: timestamp("current_period_start").notNull(),
    currentPeriodEnd: timestamp("current_period_end").notNull(),

    // Cancellation
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
    cancelledAt: timestamp("cancelled_at"),

    // Credits tracking
    creditsGranted: integer("credits_granted").notNull(),
    creditsUsed: integer("credits_used").default(0).notNull(),

    // Plan snapshot (preserves plan details if plan changes)
    planSnapshot: jsonb("plan_snapshot").$type<{
      name: string;
      credits: number;
      priceInr: number;
      priceUsd: number;
      billingInterval: string;
    }>(),

    // Metadata (for scheduled changes)
    metadata: jsonb("metadata"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("subscriptions_user_id_idx").on(table.userId)]
);
