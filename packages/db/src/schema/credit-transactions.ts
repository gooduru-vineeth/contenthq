import {
  index,
  integer,
  jsonb,
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
