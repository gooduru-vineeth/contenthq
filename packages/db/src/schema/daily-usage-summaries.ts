import {
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const dailyUsageSummaries = pgTable(
  "daily_usage_summaries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    totalRequests: integer("total_requests").default(0),
    totalCreditsUsed: integer("total_credits_used").default(0),
    totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 4 }),
    operationBreakdown: jsonb("operation_breakdown"),
    providerBreakdown: jsonb("provider_breakdown"),
    modelBreakdown: jsonb("model_breakdown"),
  },
  (table) => [
    index("daily_usage_summaries_user_id_idx").on(table.userId),
    index("daily_usage_summaries_date_idx").on(table.date),
    uniqueIndex("daily_usage_summaries_user_date_idx").on(
      table.userId,
      table.date
    ),
  ]
);
