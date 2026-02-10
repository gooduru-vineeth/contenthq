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

# Lint + Typecheck + Test (full quality check)
pnpm check                        # Runs lint, typecheck, test across all apps
pnpm lint                         # Lint all apps
pnpm lint:fix                     # Auto-fix lint issues
pnpm typecheck                    # TypeScript checks across all apps

# Test
pnpm test                         # Run all tests (Vitest)
pnpm --filter @contenthq/api test           # API tests only
pnpm --filter @contenthq/web test           # Web tests only
pnpm --filter @contenthq/api test:watch     # API tests in watch mode
pnpm --filter @contenthq/web test:watch     # Web tests in watch mode
pnpm --filter @contenthq/api test:coverage  # API test coverage
pnpm --filter @contenthq/web test:coverage  # Web test coverage

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

## Testing

**Framework**: Vitest v4 with globals enabled.

- **API tests** (`apps/api/src/__tests__/`): Node environment. Tests for middleware, env validation, tRPC routers, and app setup.
- **Web tests** (`apps/web/src/__tests__/`): jsdom environment with `@testing-library/react` + `@vitejs/plugin-react`. Setup file at `apps/web/src/test-setup.ts`.
- **Config files**: `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`.
- **Do NOT test** `apps/web/src/components/ui/` (shadcn generated components).

### Testing Rules

- ALWAYS write tests for new logic (utilities, middleware, API routes, hooks).
- ALWAYS run `pnpm test` after making code changes.
- Place test files alongside source in `__tests__/` directories mirroring the source structure.
- Use `vi.mock()` for external dependencies (database, auth, etc.).
- Use `vi.spyOn()` for observing side effects (console, fetch, etc.).
- When testing modules that read `process.env`, use `vi.resetModules()` + dynamic `import()` for isolation.
- Type all `res.json()` results with `as` assertions to satisfy strict TypeScript.

## Linting

**ESLint 9** flat config at root (`eslint.config.mjs`). Shared across all apps.

### Key Rules

- `@typescript-eslint/consistent-type-imports`: Enforces `import type` for type-only imports.
- `@typescript-eslint/no-unused-vars`: Error, but allows `_`-prefixed vars/args.
- `@typescript-eslint/no-explicit-any`: Warning (error-free in test files).
- `no-console`: Warning — only `console.warn` and `console.error` are allowed.
- **Web-specific**: `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, Next.js rules via `@next/eslint-plugin-next`.
- **Test files**: `no-console` and `no-explicit-any` are relaxed.

### Linting Rules

- ALWAYS run `pnpm lint` before committing.
- Use `import type` for type-only imports (enforced by ESLint).
- Avoid `console.log` — use `console.warn` or `console.error` instead.
- Prefix intentionally unused variables with `_` (e.g., `_unused`).

## Git Hooks

**Husky** manages git hooks. Hooks are in `.husky/`.

| Hook | What runs | Purpose |
|------|-----------|---------|
| **pre-commit** | `lint-staged` (ESLint `--fix` on staged `.ts`/`.tsx`) | Catch lint issues before commit |
| **pre-push** | `pnpm typecheck && pnpm test` | Block push if types or tests fail |

### Commit Rules

- ALWAYS verify `pnpm check` passes before pushing.
- NEVER skip hooks with `--no-verify` unless explicitly necessary.
- NEVER commit `.env` files, secrets, or credentials.
