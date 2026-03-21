/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock levelService
vi.mock("../services/levelService", () => ({
  recalculateLevel: vi.fn(),
}));

import { db } from "../db";
import { recalculateLevel } from "../services/levelService";
import { awardPoints } from "../services/pointsService";

const mockSelect = vi.mocked(db.select);
const mockTransaction = vi.mocked(db.transaction);
const mockInsert = vi.mocked(db.insert);
const mockRecalculateLevel = vi.mocked(recalculateLevel);

function setupSelectMock(pointsTotal: number) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ pointsTotal }]),
      }),
    }),
  } as any);
}

function setupTransactionMock() {
  mockTransaction.mockImplementation(async (callback: any) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    return callback(tx);
  });
}

function setupInsertMock() {
  mockInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  } as any);
}

describe("awardPoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTransactionMock();
    setupInsertMock();
    mockRecalculateLevel.mockResolvedValue({
      level: "Seed",
      didLevelUp: false,
    });
  });

  it("fetches current points_total before awarding", async () => {
    setupSelectMock(0);

    await awardPoints("project-1", 10, "test", "manual");

    expect(mockSelect).toHaveBeenCalled();
  });

  it("inserts a record into points_log via transaction", async () => {
    setupSelectMock(0);

    await awardPoints("project-1", 10, "test award", "todo");

    expect(mockTransaction).toHaveBeenCalled();
    const txCallback = mockTransaction.mock.calls[0][0] as any;
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue([]),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    };
    await txCallback(tx);
    expect(tx.insert).toHaveBeenCalled();
  });

  it("updates projects.points_total atomically in transaction", async () => {
    setupSelectMock(50);

    await awardPoints("project-1", 10, "test", "manual");

    expect(mockTransaction).toHaveBeenCalled();
  });

  it("returns newTotal = current + delta for positive delta", async () => {
    setupSelectMock(40);
    mockRecalculateLevel.mockResolvedValue({
      level: "Seed",
      didLevelUp: false,
    });

    const result = await awardPoints("project-1", 10, "test", "manual");

    expect(result.newTotal).toBe(50);
  });

  it("clamps points_total to 0 for large negative delta", async () => {
    setupSelectMock(10);
    mockRecalculateLevel.mockResolvedValue({
      level: "Seed",
      didLevelUp: false,
    });

    const result = await awardPoints("project-1", -50, "test deduct", "manual");

    expect(result.newTotal).toBe(0);
  });

  it("handles negative delta that does not go below 0", async () => {
    setupSelectMock(100);
    mockRecalculateLevel.mockResolvedValue({
      level: "Seed",
      didLevelUp: false,
    });

    const result = await awardPoints("project-1", -30, "partial deduct", "manual");

    expect(result.newTotal).toBe(70);
  });

  it("calls recalculateLevel after updating points", async () => {
    setupSelectMock(90);
    mockRecalculateLevel.mockResolvedValue({
      level: "Sprout",
      didLevelUp: true,
    });

    const result = await awardPoints("project-1", 10, "test", "todo");

    expect(mockRecalculateLevel).toHaveBeenCalledWith("project-1", 100);
    expect(result.level).toBe("Sprout");
    expect(result.didLevelUp).toBe(true);
  });

  it("logs a points_change timeline event", async () => {
    setupSelectMock(0);

    await awardPoints("project-1", 25, "first award", "milestone");

    // The timeline event insert is done outside the transaction (via db.insert)
    expect(mockInsert).toHaveBeenCalled();
  });

  it("handles zero current points (null coalesced to 0)", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ pointsTotal: null }]),
        }),
      }),
    } as any);

    const result = await awardPoints("project-1", 10, "test", "manual");

    expect(result.newTotal).toBe(10);
  });

  it("handles no project found (empty select)", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const result = await awardPoints("project-1", 10, "test", "manual");

    expect(result.newTotal).toBe(10);
  });

  it("returns correct structure with newTotal, level, didLevelUp", async () => {
    setupSelectMock(0);
    mockRecalculateLevel.mockResolvedValue({
      level: "Seed",
      didLevelUp: false,
    });

    const result = await awardPoints("project-1", 10, "test", "manual");

    expect(result).toHaveProperty("newTotal");
    expect(result).toHaveProperty("level");
    expect(result).toHaveProperty("didLevelUp");
    expect(typeof result.newTotal).toBe("number");
    expect(typeof result.level).toBe("string");
    expect(typeof result.didLevelUp).toBe("boolean");
  });
});
