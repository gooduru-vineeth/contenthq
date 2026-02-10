# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Start everything (requires Docker for Postgres)
pnpm docker:up                    # Start Postgres
pnpm dev                          # Start all apps (web :3000, api :3001)

# Build
pnpm build                        # Build all packages (Turborepo)
pnpm --filter @contenthq/web build   # Build web only
pnpm --filter @contenthq/api build   # Type-check API only (tsc --noEmit)

# Lint
pnpm lint

# Database (requires .env with DATABASE_URL at root, loaded via dotenv-cli)
pnpm db:generate                  # Generate Drizzle migrations
pnpm db:migrate                   # Run migrations
pnpm db:push                      # Push schema directly (dev shortcut)
pnpm db:studio                    # Open Drizzle Studio GUI
```

## Architecture

**Monorepo**: pnpm workspaces + Turborepo. Package manager is pnpm 9.

### Apps

- **`apps/web`** — Next.js 15 (React 19, App Router, Turbopack). Frontend at `:3000`.
- **`apps/api`** — Hono HTTP server running on Node via `@hono/node-server` at `:3001`. All API business logic lives here.

### Packages

- **`packages/db`** — Drizzle ORM + `postgres` driver. Exports `db` client, schema tables. Used by both `api` and `web` (transpiled via `next.config.ts`).
- **`packages/typescript-config`** — Shared tsconfig presets (`base.json`, `node.json`, `nextjs.json`).

### Data Flow: tRPC (end-to-end type safety)

```
web (trpc hooks) → HTTP /trpc/* → api (Hono) → tRPC router → Drizzle → Postgres
```

- **API side**: `apps/api/src/trpc/` — `trpc.ts` defines `publicProcedure` and `protectedProcedure` (auth-gated via better-auth session). Routers live in `trpc/routers/`. The root `appRouter` is mounted on Hono at `/trpc/*` in `app.ts`.
- **Web side**: `apps/web/src/lib/trpc.ts` exports typed hooks. `TRPCProvider` in `components/trpc-provider.tsx` wraps the app with the client + React Query.
- **Type import path**: Web imports `AppRouter` type from `@contenthq/api/src/trpc/routers` via tsconfig path alias.
- **Transformer**: superjson on both sides (handles Dates, Maps, etc.).

**Adding a new tRPC router**: Create file in `apps/api/src/trpc/routers/`, add to `appRouter` in `routers/index.ts`. The web app gets type-safe hooks automatically.

### Auth: better-auth

- **API**: `apps/api/src/lib/auth.ts` — better-auth instance with Drizzle adapter, email/password enabled. Mounted as raw Hono route at `/auth/**`.
- **Web**: `apps/web/src/lib/auth-client.ts` — `createAuthClient` pointed at API URL.
- **tRPC context**: `apps/api/src/trpc/context.ts` extracts session from request headers. `protectedProcedure` enforces auth.

### Frontend Stack

- **UI**: shadcn/ui components in `apps/web/src/components/ui/` (Radix primitives + Tailwind CSS v4 + CVA). Config: `components.json`.
- **Styling**: Tailwind v4 with CSS variables for theming (light/dark) in `globals.css`. Uses `@theme inline` for Tailwind token mapping.
- **State**: Zustand (client state), TanStack React Query (server state via tRPC).
- **Forms**: react-hook-form + @hookform/resolvers (Zod validation).
- **Tables**: @tanstack/react-table.
- **Animations**: framer-motion.
- **Toasts**: sonner (configured in root layout).
- **URL state**: nuqs.
- **Icons**: lucide-react.
- **Utility**: `cn()` helper in `lib/utils.ts` (clsx + tailwind-merge).

### Hono REST Routes (non-tRPC)

`apps/api/src/routes/` — Traditional Hono routes for things that don't fit tRPC (auth passthrough, health check). CORS middleware in `middleware/cors.ts`, error handler in `middleware/error.ts`.

### Environment

- `.env` at root (loaded by `dotenv-cli` for db commands, read by API process via `src/lib/env.ts` Zod schema).
- Web env validated via `@t3-oss/env-nextjs` in `apps/web/src/lib/env.ts`.
- Required vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`, `NEXT_PUBLIC_API_URL`, `PORT`.

### Provider Wrapping Order

Root layout → `<Providers>` → `<TRPCProvider>` (includes QueryClientProvider) → `<TooltipProvider>` → children + `<Toaster>`.
