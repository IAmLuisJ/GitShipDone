/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getLevel } from "../services/levelService";

describe("getLevel", () => {
  it("returns Seed for 0 points", () => {
    expect(getLevel(0)).toBe("Seed");
  });

  it("returns Seed for 99 points", () => {
    expect(getLevel(99)).toBe("Seed");
  });

  it("returns Sprout for 100 points", () => {
    expect(getLevel(100)).toBe("Sprout");
  });

  it("returns Sprout for 299 points", () => {
    expect(getLevel(299)).toBe("Sprout");
  });

  it("returns Growing for 300 points", () => {
    expect(getLevel(300)).toBe("Growing");
  });

  it("returns Growing for 699 points", () => {
    expect(getLevel(699)).toBe("Growing");
  });

  it("returns Shipping for 700 points", () => {
    expect(getLevel(700)).toBe("Shipping");
  });

  it("returns Shipping for 1499 points", () => {
    expect(getLevel(1499)).toBe("Shipping");
  });

  it("returns Launched for 1500 points", () => {
    expect(getLevel(1500)).toBe("Launched");
  });

  it("returns Launched for 10000 points", () => {
    expect(getLevel(10000)).toBe("Launched");
  });
});

// Mock DB for recalculateLevel tests
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from "../db";
import { recalculateLevel } from "../services/levelService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

function setupSelectMock(currentLevel: string) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ level: currentLevel }]),
      }),
    }),
  } as any);
}

function setupUpdateMock() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  } as any);
}

describe("recalculateLevel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUpdateMock();
  });

  it("updates level to Sprout when points reach 100", async () => {
    setupSelectMock("Seed");

    const result = await recalculateLevel("project-1", 100);

    expect(result.level).toBe("Sprout");
    expect(result.didLevelUp).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("reports didLevelUp = false when level unchanged", async () => {
    setupSelectMock("Seed");

    const result = await recalculateLevel("project-1", 50);

    expect(result.level).toBe("Seed");
    expect(result.didLevelUp).toBe(false);
  });

  it("updates level to Growing at 300 points", async () => {
    setupSelectMock("Sprout");

    const result = await recalculateLevel("project-1", 300);

    expect(result.level).toBe("Growing");
    expect(result.didLevelUp).toBe(true);
  });

  it("updates level to Shipping at 700 points", async () => {
    setupSelectMock("Growing");

    const result = await recalculateLevel("project-1", 700);

    expect(result.level).toBe("Shipping");
    expect(result.didLevelUp).toBe(true);
  });

  it("updates level to Launched at 1500 points", async () => {
    setupSelectMock("Shipping");

    const result = await recalculateLevel("project-1", 1500);

    expect(result.level).toBe("Launched");
    expect(result.didLevelUp).toBe(true);
  });

  it("persists the new level in the database", async () => {
    setupSelectMock("Seed");

    await recalculateLevel("project-1", 100);

    const updateResult = mockUpdate.mock.results[0].value as any;
    const setCall = updateResult.set.mock.calls[0][0];
    expect(setCall.level).toBe("Sprout");
  });
});
