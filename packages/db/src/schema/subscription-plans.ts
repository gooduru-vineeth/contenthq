import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Billing interval enum
export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "yearly",
]);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),

  // Marketing & Display
  description: text("description"),
  slug: text("slug").notNull().unique(),

  // Legacy field (keep for backward compatibility)
  monthlyCredits: integer("monthly_credits").notNull(),
  price: numeric("price").notNull(),

  // Pricing (dual currency)
  priceInr: integer("price_inr").notNull().default(0),
  priceUsd: integer("price_usd").notNull().default(0),
  billingInterval: billingIntervalEnum("billing_interval")
    .notNull()
    .default("monthly"),

  // Credits allocation
  credits: integer("credits").notNull().default(0),
  bonusCredits: integer("bonus_credits").default(0),

  // Status & Visibility
  active: boolean("active").default(true).notNull(),
  isDefault: boolean("is_default").default(false),
  popular: boolean("popular").default(false),

  // Display ordering
  sortOrder: integer("sort_order").default(0).notNull(),

  // Features (for pricing cards)
  features: jsonb("features").$type<{
    maxProjects?: number;
    maxConcurrentPipelines?: number;
    pipelinesPerDay?: number;
    pipelinesPerMonth?: number;
    priorityProcessing?: boolean;
    dedicatedSupport?: boolean;
    apiAccess?: boolean;
  }>(),

  limits: jsonb("limits"),
  rateLimits: jsonb("rate_limits"),

  // Metadata
  metadata: jsonb("metadata"),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
