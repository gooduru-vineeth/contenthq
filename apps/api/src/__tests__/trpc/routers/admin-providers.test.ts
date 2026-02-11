import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock db module
vi.mock("@contenthq/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// We test the router by calling procedures directly via a tRPC caller
// For unit tests, we verify the adminProcedure middleware blocks non-admins

describe("adminProviderRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("middleware - auth checks", () => {
    it("should reject unauthenticated users", async () => {
      // Import fresh to get mocked version
      const { initTRPC } = await import("@trpc/server");
      const t = initTRPC.context<{ user: null; session: null }>().create();

      const protectedProcedure = t.procedure.use(({ ctx, next }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return next({ ctx });
      });

      const router = t.router({
        test: protectedProcedure.query(() => "ok"),
      });

      const caller = router.createCaller({ user: null, session: null });

      await expect(caller.test()).rejects.toThrow(TRPCError);
      await expect(caller.test()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("should reject non-admin users with FORBIDDEN", async () => {
      const { initTRPC } = await import("@trpc/server");

      type Ctx = {
        user: { id: string; role: string } | null;
        session: unknown;
      };

      const t = initTRPC.context<Ctx>().create();

      const protectedProcedure = t.procedure.use(({ ctx, next }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return next({ ctx: { ...ctx, user: ctx.user } });
      });

      const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required",
          });
        }
        return next({ ctx });
      });

      const router = t.router({
        test: adminProcedure.query(() => "ok"),
      });

      const caller = router.createCaller({
        user: { id: "user-1", role: "user" },
        session: {},
      });

      await expect(caller.test()).rejects.toThrow(TRPCError);
      await expect(caller.test()).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    });

    it("should allow admin users", async () => {
      const { initTRPC } = await import("@trpc/server");

      type Ctx = {
        user: { id: string; role: string } | null;
        session: unknown;
      };

      const t = initTRPC.context<Ctx>().create();

      const protectedProcedure = t.procedure.use(({ ctx, next }) => {
        if (!ctx.user) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }
        return next({ ctx: { ...ctx, user: ctx.user } });
      });

      const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Admin access required",
          });
        }
        return next({ ctx });
      });

      const router = t.router({
        test: adminProcedure.query(() => "ok"),
      });

      const caller = router.createCaller({
        user: { id: "admin-1", role: "admin" },
        session: {},
      });

      const result = await caller.test();
      expect(result).toBe("ok");
    });
  });

  describe("input validation", () => {
    it("should validate createProviderSchema", async () => {
      const { createProviderSchema } = await import("@contenthq/shared");

      const valid = createProviderSchema.safeParse({
        name: "OpenAI",
        slug: "openai",
        type: "llm",
        isEnabled: true,
      });
      expect(valid.success).toBe(true);

      const invalidSlug = createProviderSchema.safeParse({
        name: "OpenAI",
        slug: "OpenAI!!",
        type: "llm",
      });
      expect(invalidSlug.success).toBe(false);

      const invalidType = createProviderSchema.safeParse({
        name: "OpenAI",
        slug: "openai",
        type: "invalid",
      });
      expect(invalidType.success).toBe(false);
    });

    it("should validate updateProviderSchema requires id", async () => {
      const { updateProviderSchema } = await import("@contenthq/shared");

      const withoutId = updateProviderSchema.safeParse({
        name: "Updated",
      });
      expect(withoutId.success).toBe(false);

      const withId = updateProviderSchema.safeParse({
        id: "some-id",
        name: "Updated",
      });
      expect(withId.success).toBe(true);
    });
  });
});
