import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";
import { creditReservationStatusEnum } from "./enums";

export const creditReservations = pgTable(
  "credit_reservations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id"),
    amount: integer("amount").notNull(),
    operationType: text("operation_type").notNull(),
    status: creditReservationStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    settledAt: timestamp("settled_at"),
  },
  (table) => [
    index("credit_reservations_user_id_idx").on(table.userId),
    index("credit_reservations_status_idx").on(table.status),
  ]
);
