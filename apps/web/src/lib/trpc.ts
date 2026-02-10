import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@contenthq/api/src/trpc/routers";

export const trpc: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();
