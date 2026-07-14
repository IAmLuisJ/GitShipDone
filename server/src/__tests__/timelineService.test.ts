 
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

import { db } from "../db";
import { logTimelineEvent } from "../services/timelineService";

const mockInsert = vi.mocked(db.insert);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("logTimelineEvent", () => {
  it("inserts a timeline event into the database", async () => {
    const mockValues = vi.fn().mockResolvedValue([{}]);
    mockInsert.mockReturnValue({ values: mockValues } as any);

    await logTimelineEvent("project-1", "journal", {
      title: "My entry",
      mood: "happy",
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockValues).toHaveBeenCalledWith({
      projectId: "project-1",
      type: "journal",
      payload: { title: "My entry", mood: "happy" },
    });
  });

  it("includes refId when provided", async () => {
    const mockValues = vi.fn().mockResolvedValue([{}]);
    mockInsert.mockReturnValue({ values: mockValues } as any);

    await logTimelineEvent(
      "project-2",
      "milestone_completed",
      { milestoneName: "Launch" },
      "ref-123",
    );

    expect(mockValues).toHaveBeenCalledWith({
      projectId: "project-2",
      type: "milestone_completed",
      payload: { milestoneName: "Launch" },
      refId: "ref-123",
    });
  });

  it("does not throw when DB insert fails", async () => {
    const mockValues = vi.fn().mockRejectedValue(new Error("DB down"));
    mockInsert.mockReturnValue({ values: mockValues } as any);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      logTimelineEvent("project-3", "status_change", { from: null, to: "active" }),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to log timeline event:",
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it("supports all event types", async () => {
    const mockValues = vi.fn().mockResolvedValue([{}]);
    mockInsert.mockReturnValue({ values: mockValues } as any);

    const types = [
      "journal",
      "milestone_completed",
      "todo_batch",
      "github_commit",
      "github_release",
      "progress_change",
      "points_change",
      "status_change",
    ] as const;

    for (const type of types) {
      await logTimelineEvent("p-1", type, { test: true });
    }

    expect(mockInsert).toHaveBeenCalledTimes(types.length);
  });

  it("stores payload as JSONB-compatible object", async () => {
    const mockValues = vi.fn().mockResolvedValue([{}]);
    mockInsert.mockReturnValue({ values: mockValues } as any);

    const payload = {
      nested: { key: "value" },
      array: [1, 2, 3],
      num: 42,
      bool: true,
      nullVal: null,
    };

    await logTimelineEvent("p-1", "progress_change", payload);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ payload }),
    );
  });
});
