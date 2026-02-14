import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const creditBalances = pgTable(
  "credit_balances",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: "cascade" }),
    balance: integer("balance").default(0),
    reservedBalance: integer("reserved_balance").default(0).notNull(),
    lifetimeCreditsReceived: integer("lifetime_credits_received")
      .default(0)
      .notNull(),
    lifetimeCreditsUsed: integer("lifetime_credits_used")
      .default(0)
      .notNull(),
    bonusBalance: integer("bonus_balance").default(0).notNull(),
    lowBalanceThreshold: integer("low_balance_threshold"),
    lowBalanceNotifiedAt: timestamp("low_balance_notified_at", {
      withTimezone: true,
    }),
    lastUpdated: timestamp("last_updated").notNull().defaultNow(),
  },
  (table) => [index("credit_balances_user_id_idx").on(table.userId)]
);
