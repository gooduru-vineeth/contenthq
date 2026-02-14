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

export const bonusCreditSourceEnum = pgEnum("bonus_credit_source", [
  "promotional",
  "referral",
  "compensation",
  "loyalty",
  "trial",
  "admin_grant",
  "signup_bonus",
]);

export const bonusCredits = pgTable(
  "bonus_credits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    originalAmount: integer("original_amount").notNull(),
    remainingAmount: integer("remaining_amount").notNull(),
    source: bonusCreditSourceEnum("source").notNull(),
    description: text("description"),
    campaignId: text("campaign_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    isExpired: boolean("is_expired").default(false),
    grantedBy: text("granted_by"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("bonus_credits_user_id_idx").on(table.userId),
    index("bonus_credits_expires_at_idx").on(table.expiresAt),
  ]
);
