import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@contenthq/db/client";
import { env } from "./env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  basePath: "/auth",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: ["*"],
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false,
      },
    },
    onCreate: async (user: any) => {
      // Import dynamically to avoid circular dependencies
      const { subscriptionService } = await import("../services/subscription.service");
      try {
        await subscriptionService.assignDefaultPlan(user.id);
        console.log(`[Auth] Assigned default plan to user ${user.id}`);
      } catch (error) {
        console.error(`[Auth] Failed to assign default plan:`, error);
      }
    },
  },
});
