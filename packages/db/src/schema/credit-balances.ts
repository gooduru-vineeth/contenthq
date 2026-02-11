import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./users";

export const creditBalances = pgTable("credit_balances", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id),
  balance: integer("balance").default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});
