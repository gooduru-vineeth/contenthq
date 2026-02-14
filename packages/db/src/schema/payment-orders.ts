import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "./users";
import { creditPacks } from "./credit-packs";
import { paymentStatusEnum } from "./enums";

export const paymentOrders = pgTable(
  "payment_orders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    creditPackId: text("credit_pack_id")
      .notNull()
      .references(() => creditPacks.id),
    provider: text("provider").notNull(),
    externalOrderId: text("external_order_id"),
    externalPaymentId: text("external_payment_id"),
    credits: integer("credits").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("created"),
    providerData: jsonb("provider_data"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    creditTransactionId: text("credit_transaction_id"),
    failureReason: text("failure_reason"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("payment_orders_user_id_idx").on(table.userId),
    index("payment_orders_external_order_id_idx").on(table.externalOrderId),
    index("payment_orders_idempotency_key_idx").on(table.idempotencyKey),
  ]
);
