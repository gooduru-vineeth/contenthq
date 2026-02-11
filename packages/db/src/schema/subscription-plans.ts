import {
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  monthlyCredits: integer("monthly_credits").notNull(),
  price: numeric("price").notNull(),
  limits: jsonb("limits"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
