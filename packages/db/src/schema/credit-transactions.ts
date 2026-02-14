import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";

export const creditTransactions = pgTable(
  "credit_transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    description: text("description"),
    jobId: text("job_id"),
    projectId: text("project_id"),
    operationType: text("operation_type"),
    provider: text("provider"),
    model: text("model"),
    adminUserId: text("admin_user_id"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    cachedInputTokens: integer("cached_input_tokens"),
    inputTokenCost: numeric("input_token_cost", { precision: 10, scale: 6 }),
    outputTokenCost: numeric("output_token_cost", { precision: 10, scale: 6 }),
    actualCostCredits: numeric("actual_cost_credits", {
      precision: 10,
      scale: 2,
    }),
    billedCostCredits: numeric("billed_cost_credits", {
      precision: 10,
      scale: 2,
    }),
    costMultiplier: numeric("cost_multiplier", { precision: 4, scale: 2 }),
    costBreakdown: jsonb("cost_breakdown"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("credit_transactions_user_id_idx").on(table.userId),
    index("credit_transactions_created_at_idx").on(table.createdAt),
    index("credit_transactions_project_id_idx").on(table.projectId),
    index("credit_transactions_operation_type_idx").on(table.operationType),
  ]
);
