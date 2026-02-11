import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { env } from "./env";

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL,
  basePath: "/auth",
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          required: false,
          defaultValue: "user",
        },
      },
    }),
  ],
});
