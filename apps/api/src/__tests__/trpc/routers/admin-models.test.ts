import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

vi.mock("@contenthq/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("adminModelRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("middleware - auth checks", () => {
    it("should reject unauthenticated users", async () => {
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
    it("should validate createModelSchema", async () => {
      const { createModelSchema } = await import("@contenthq/shared");

      const valid = createModelSchema.safeParse({
        providerId: "provider-1",
        name: "GPT-4o",
        modelId: "gpt-4o",
        isDefault: false,
      });
      expect(valid.success).toBe(true);

      const missingRequired = createModelSchema.safeParse({
        name: "GPT-4o",
      });
      expect(missingRequired.success).toBe(false);
    });

    it("should validate updateModelSchema requires id", async () => {
      const { updateModelSchema } = await import("@contenthq/shared");

      const withoutId = updateModelSchema.safeParse({
        name: "Updated",
      });
      expect(withoutId.success).toBe(false);

      const withId = updateModelSchema.safeParse({
        id: "some-id",
        name: "Updated",
      });
      expect(withId.success).toBe(true);
    });

    it("should allow optional fields in createModelSchema", async () => {
      const { createModelSchema } = await import("@contenthq/shared");

      const minimal = createModelSchema.safeParse({
        providerId: "p1",
        name: "Model",
        modelId: "model-1",
        isDefault: false,
      });
      expect(minimal.success).toBe(true);

      const full = createModelSchema.safeParse({
        providerId: "p1",
        name: "Model",
        modelId: "model-1",
        type: "chat",
        isDefault: true,
        costs: { input_per_1k: 0.01 },
        capabilities: { vision: true },
      });
      expect(full.success).toBe(true);
    });
  });
});
