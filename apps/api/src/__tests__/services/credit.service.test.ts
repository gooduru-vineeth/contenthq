import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module before importing anything that uses it.
// The credit service uses `db.transaction()` for most operations and
// `db.select().from().where()` for reads, so we mock the Drizzle
// query builder chain.
vi.mock("@contenthq/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
    execute: vi.fn(),
  },
}));

// Mock the schema imports so Drizzle table references resolve
vi.mock("@contenthq/db/schema", () => ({
  creditBalances: {
    userId: "user_id",
    balance: "balance",
    reservedBalance: "reserved_balance",
    lastUpdated: "last_updated",
  },
  creditTransactions: {
    userId: "user_id",
    type: "type",
    projectId: "project_id",
    createdAt: "created_at",
  },
  creditReservations: {
    id: "id",
    userId: "user_id",
    status: "status",
    expiresAt: "expires_at",
    settledAt: "settled_at",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, val: unknown) => ({ type: "eq", val })),
  sql: vi.fn(),
  desc: vi.fn((_col: unknown) => ({ type: "desc" })),
  and: vi.fn((...conditions: unknown[]) => ({ type: "and", conditions })),
  lt: vi.fn((_col: unknown, val: unknown) => ({ type: "lt", val })),
}));

import { creditService } from "../../services/credit.service";
import { db } from "@contenthq/db/client";

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Build a mock Drizzle select chain: db.select().from().where() */
function mockSelectChain(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return { from, where };
}

/** Build a mock Drizzle insert chain: db.insert().values().returning() */
function mockInsertChain(rows: unknown[]) {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values });
  return { values, returning };
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("creditService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getBalance", () => {
    it("returns existing balance when found", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 100,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const result = await creditService.getBalance("user1");
      expect(result).toEqual(mockBalance);
    });

    it("creates balance with default free credits for new users", async () => {
      // First select returns empty (no existing balance)
      mockSelectChain([]);

      // Then insert returns the new balance
      const newBalance = {
        id: "bal-2",
        userId: "user1",
        balance: 50,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockInsertChain([newBalance]);

      const result = await creditService.getBalance("user1");
      expect(result).toBeDefined();
      expect(result.balance).toBe(50);
    });
  });

  describe("getAvailableBalance", () => {
    it("returns balance minus reserved", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 100,
        reservedBalance: 20,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const available = await creditService.getAvailableBalance("user1");
      expect(available).toBe(80);
    });

    it("returns full balance when nothing is reserved", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 75,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const available = await creditService.getAvailableBalance("user1");
      expect(available).toBe(75);
    });

    it("handles null balance as zero", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: null,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const available = await creditService.getAvailableBalance("user1");
      expect(available).toBe(0);
    });
  });

  describe("checkSufficientCredits", () => {
    it("returns true when balance is sufficient", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 100,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const result = await creditService.checkSufficientCredits("user1", 50);
      expect(result).toBe(true);
    });

    it("returns true when balance exactly equals the amount", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 50,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const result = await creditService.checkSufficientCredits("user1", 50);
      expect(result).toBe(true);
    });

    it("returns false when balance is insufficient", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 10,
        reservedBalance: 0,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      const result = await creditService.checkSufficientCredits("user1", 50);
      expect(result).toBe(false);
    });

    it("accounts for reserved balance when checking sufficiency", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 100,
        reservedBalance: 80,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      // Available = 100 - 80 = 20, requesting 50 -> insufficient
      const result = await creditService.checkSufficientCredits("user1", 50);
      expect(result).toBe(false);
    });

    it("returns true when available (balance - reserved) is sufficient", async () => {
      const mockBalance = {
        id: "bal-1",
        userId: "user1",
        balance: 100,
        reservedBalance: 30,
        lastUpdated: new Date(),
      };
      mockSelectChain([mockBalance]);

      // Available = 100 - 30 = 70, requesting 50 -> sufficient
      const result = await creditService.checkSufficientCredits("user1", 50);
      expect(result).toBe(true);
    });
  });

  describe("reserveCredits", () => {
    it("creates a reservation within a transaction", async () => {
      const mockReservation = {
        id: "res-1",
        userId: "user1",
        projectId: "proj-1",
        amount: 10,
        operationType: "IMAGE_GENERATION",
        status: "active",
        expiresAt: new Date(Date.now() + 3600_000),
        createdAt: new Date(),
        settledAt: null,
      };

      // Mock the transaction callback
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "bal-1",
                user_id: "user1",
                balance: 100,
                reserved_balance: 0,
                last_updated: new Date(),
              },
            ],
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockReservation]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      const result = await creditService.reserveCredits(
        "user1",
        10,
        "IMAGE_GENERATION",
        "proj-1"
      );

      expect(result).toBeDefined();
      expect(result.status).toBe("active");
      expect(result.amount).toBe(10);
    });

    it("throws when insufficient credits", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "bal-1",
                user_id: "user1",
                balance: 5,
                reserved_balance: 0,
                last_updated: new Date(),
              },
            ],
          }),
        };
        return cb(tx);
      });

      await expect(
        creditService.reserveCredits("user1", 50, "IMAGE_GENERATION")
      ).rejects.toThrow("Insufficient credits");
    });
  });

  describe("deductCredits", () => {
    it("deducts credits and records a transaction", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user1",
        type: "usage",
        amount: -10,
        description: "Image generation",
        createdAt: new Date(),
      };

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "bal-1",
                user_id: "user1",
                balance: 100,
                reserved_balance: 0,
                last_updated: new Date(),
              },
            ],
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      const result = await creditService.deductCredits(
        "user1",
        10,
        "Image generation",
        { projectId: "proj-1", operationType: "IMAGE_GENERATION" }
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(-10);
      expect(result.type).toBe("usage");
    });

    it("throws when balance is insufficient", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "bal-1",
                user_id: "user1",
                balance: 5,
                reserved_balance: 0,
                last_updated: new Date(),
              },
            ],
          }),
        };
        return cb(tx);
      });

      await expect(
        creditService.deductCredits("user1", 50, "Image generation")
      ).rejects.toThrow("Insufficient credits");
    });

    it("auto-creates balance for new user then deducts", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user1",
        type: "usage",
        amount: -5,
        description: "TTS generation",
        createdAt: new Date(),
      };

      let callCount = 0;

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // First call: no balance found
              return Promise.resolve({ rows: [] });
            }
            // Second call: balance created with defaults
            return Promise.resolve({
              rows: [
                {
                  id: "bal-new",
                  user_id: "user1",
                  balance: 50, // DEFAULT_FREE_CREDITS
                  reserved_balance: 0,
                  last_updated: new Date(),
                },
              ],
            });
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      const result = await creditService.deductCredits("user1", 5, "TTS generation");

      expect(result).toBeDefined();
      expect(result.amount).toBe(-5);
    });
  });

  describe("addCredits", () => {
    it("adds credits to existing user", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user1",
        type: "purchase",
        amount: 100,
        description: "Credit pack purchase",
        createdAt: new Date(),
      };

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "bal-1",
                user_id: "user1",
                balance: 50,
                reserved_balance: 0,
                last_updated: new Date(),
              },
            ],
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      const result = await creditService.addCredits("user1", 100, "Credit pack purchase");

      expect(result).toBeDefined();
      expect(result.amount).toBe(100);
      expect(result.type).toBe("purchase");
    });
  });

  describe("settleReservation", () => {
    it("settles an active reservation", async () => {
      const mockTransaction = {
        id: "txn-1",
        userId: "user1",
        type: "usage",
        amount: -8,
        description: "Image generation (settled)",
        createdAt: new Date(),
      };

      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        let executeCallCount = 0;
        const tx = {
          execute: vi.fn().mockImplementation(() => {
            executeCallCount++;
            if (executeCallCount === 1) {
              // First: lock reservation
              return Promise.resolve({
                rows: [
                  {
                    id: "res-1",
                    user_id: "user1",
                    project_id: "proj-1",
                    amount: 10,
                    operation_type: "IMAGE_GENERATION",
                    status: "active",
                    expires_at: new Date(Date.now() + 3600_000),
                    created_at: new Date(),
                    settled_at: null,
                  },
                ],
              });
            }
            // Second: lock balance
            return Promise.resolve({
              rows: [
                {
                  id: "bal-1",
                  user_id: "user1",
                  balance: 100,
                  reserved_balance: 10,
                  last_updated: new Date(),
                },
              ],
            });
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([mockTransaction]),
            }),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      const result = await creditService.settleReservation(
        "res-1",
        8,
        "Image generation (settled)"
      );

      expect(result).toBeDefined();
      expect(result.amount).toBe(-8);
    });

    it("throws when reservation is not found", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({ rows: [] }),
        };
        return cb(tx);
      });

      await expect(
        creditService.settleReservation("res-missing", 10, "test")
      ).rejects.toThrow("Reservation res-missing not found");
    });

    it("throws when reservation is already settled", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({
            rows: [
              {
                id: "res-1",
                user_id: "user1",
                amount: 10,
                status: "settled",
              },
            ],
          }),
        };
        return cb(tx);
      });

      await expect(
        creditService.settleReservation("res-1", 10, "test")
      ).rejects.toThrow("already settled");
    });
  });

  describe("releaseReservation", () => {
    it("releases an active reservation without deducting credits", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        let executeCallCount = 0;
        const tx = {
          execute: vi.fn().mockImplementation(() => {
            executeCallCount++;
            if (executeCallCount === 1) {
              return Promise.resolve({
                rows: [
                  {
                    id: "res-1",
                    user_id: "user1",
                    amount: 10,
                    operation_type: "IMAGE_GENERATION",
                    status: "active",
                  },
                ],
              });
            }
            return Promise.resolve({
              rows: [
                {
                  id: "bal-1",
                  user_id: "user1",
                  balance: 100,
                  reserved_balance: 10,
                  last_updated: new Date(),
                },
              ],
            });
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
        return cb(tx);
      });

      // Should not throw
      await expect(
        creditService.releaseReservation("res-1")
      ).resolves.toBeUndefined();
    });

    it("throws when reservation is not found", async () => {
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
        const tx = {
          execute: vi.fn().mockResolvedValue({ rows: [] }),
        };
        return cb(tx);
      });

      await expect(
        creditService.releaseReservation("res-missing")
      ).rejects.toThrow("Reservation res-missing not found");
    });
  });

  describe("getTransactions", () => {
    it("returns transactions for a user", async () => {
      const mockTransactions = [
        {
          id: "txn-1",
          userId: "user1",
          type: "usage",
          amount: -5,
          description: "Image gen",
          createdAt: new Date(),
        },
        {
          id: "txn-2",
          userId: "user1",
          type: "purchase",
          amount: 100,
          description: "Credit pack",
          createdAt: new Date(),
        },
      ];

      const offset = vi.fn().mockResolvedValue(mockTransactions);
      const limit = vi.fn().mockReturnValue({ offset });
      const orderBy = vi.fn().mockReturnValue({ limit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from });

      const result = await creditService.getTransactions("user1");

      expect(result).toEqual(mockTransactions);
      expect(result).toHaveLength(2);
    });

    it("applies limit and offset options", async () => {
      const mockOffset = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const orderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from });

      await creditService.getTransactions("user1", { limit: 10, offset: 20 });

      expect(mockLimit).toHaveBeenCalledWith(10);
      expect(mockOffset).toHaveBeenCalledWith(20);
    });

    it("uses default limit of 50 and offset of 0", async () => {
      const mockOffset = vi.fn().mockResolvedValue([]);
      const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
      const orderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const where = vi.fn().mockReturnValue({ orderBy });
      const from = vi.fn().mockReturnValue({ where });
      (db.select as ReturnType<typeof vi.fn>).mockReturnValue({ from });

      await creditService.getTransactions("user1");

      expect(mockLimit).toHaveBeenCalledWith(50);
      expect(mockOffset).toHaveBeenCalledWith(0);
    });
  });
});
