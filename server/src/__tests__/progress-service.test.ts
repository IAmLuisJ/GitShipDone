/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from "../db";
import { recalculateProgress } from "../services/progressService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockInsert = vi.mocked(db.insert);

function setupSelectMocks(total: number, done: number, oldProgress: number) {
  // First call: count todos
  const todosFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ total, done }]),
  });
  // Second call: get current progress
  const projectFrom = vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ progressAuto: oldProgress }]),
  });

  let callCount = 0;
  mockSelect.mockImplementation((..._args: any[]) => {
    callCount++;
    if (callCount === 1) {
      return { from: todosFrom } as any;
    }
    return { from: projectFrom } as any;
  });
}

function setupUpdateMock() {
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  } as any);
}

function setupInsertMock() {
  mockInsert.mockReturnValue({
    values: vi.fn().mockResolvedValue([]),
  } as any);
}

describe("recalculateProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupUpdateMock();
    setupInsertMock();
  });

  it("returns 0 when project has no todos", async () => {
    setupSelectMocks(0, 0, 0);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(0);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("calculates 50% when 2 of 4 todos are done", async () => {
    setupSelectMocks(4, 2, 0);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(50);
  });

  it("calculates 100% when all todos are done", async () => {
    setupSelectMocks(4, 4, 0);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(100);
  });

  it("calculates 75% when 3 of 4 todos are done", async () => {
    setupSelectMocks(4, 3, 100);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(75);
  });

  it("rounds to nearest integer", async () => {
    setupSelectMocks(3, 1, 0);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(33);
  });

  it("logs timeline event when progress changes by >= 5%", async () => {
    setupSelectMocks(4, 2, 0); // 0 → 50, change of 50

    await recalculateProgress("project-1");

    expect(mockInsert).toHaveBeenCalled();
    const insertCall = mockInsert.mock.results[0];
    const valuesCall = (insertCall.value as any).values;
    const payload = valuesCall.mock.calls[0][0];
    expect(payload.type).toBe("progress_change");
    expect(payload.payload).toEqual({ from: 0, to: 50, isManual: false });
  });

  it("does NOT log timeline event when progress changes by < 5%", async () => {
    setupSelectMocks(100, 50, 48); // 48 → 50, change of 2

    await recalculateProgress("project-1");

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("updates projects.progress_auto in database", async () => {
    setupSelectMocks(4, 2, 0);

    await recalculateProgress("project-1");

    expect(mockUpdate).toHaveBeenCalled();
    const updateResult = mockUpdate.mock.results[0].value as any;
    const setCall = updateResult.set.mock.calls[0][0];
    expect(setCall.progressAuto).toBe(50);
  });

  it("handles null done count gracefully", async () => {
    setupSelectMocks(0, null as any, 0);

    const result = await recalculateProgress("project-1");

    expect(result).toBe(0);
  });
});
