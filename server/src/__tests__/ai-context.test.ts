/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from "../db";
import { buildProjectContext } from "../services/aiContextService";

const mockSelect = vi.mocked(db.select);

const fakeProject = {
  id: "proj-1",
  userId: "user-1",
  name: "My App",
  description: "A cool project for building stuff",
  type: "software",
  status: "active",
  progressAuto: 45,
  progressManual: null,
  pointsTotal: 350,
  level: "Growing",
  shareToken: null,
  isPublic: false,
  githubRepoId: null,
  githubRepoName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeMilestones = [
  { name: "MVP", status: "completed" },
  { name: "Beta", status: "in_progress" },
  { name: "Launch", status: "pending" },
];

const fakeJournals = [
  { title: "Got the API working" },
  { title: "Fixed auth bugs" },
];

describe("buildProjectContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns formatted context with all fields", async () => {
    // Project query
    const mockFrom1 = vi.fn().mockReturnThis();
    const mockWhere1 = vi.fn().mockReturnThis();
    const mockLimit1 = vi.fn().mockResolvedValue([fakeProject]);

    // Milestones query
    const mockFrom2 = vi.fn().mockReturnThis();
    const mockWhere2 = vi.fn().mockReturnThis();
    const mockOrderBy2 = vi.fn().mockReturnThis();
    const mockLimit2 = vi.fn().mockResolvedValue(fakeMilestones);

    // Journal query
    const mockFrom3 = vi.fn().mockReturnThis();
    const mockWhere3 = vi.fn().mockReturnThis();
    const mockOrderBy3 = vi.fn().mockReturnThis();
    const mockLimit3 = vi.fn().mockResolvedValue(fakeJournals);

    // Todos query
    const mockFrom4 = vi.fn().mockReturnThis();
    const mockWhere4 = vi.fn().mockResolvedValue([
      { isCompleted: true },
      { isCompleted: false },
      { isCompleted: false },
    ]);

    mockSelect
      .mockReturnValueOnce({
        from: mockFrom1,
        where: mockWhere1,
        limit: mockLimit1,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        orderBy: mockOrderBy2,
        limit: mockLimit2,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
        orderBy: mockOrderBy3,
        limit: mockLimit3,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom4,
        where: mockWhere4,
      } as any);

    const result = await buildProjectContext("proj-1");

    expect(result).toContain("Project: My App (software)");
    expect(result).toContain("Vision: A cool project for building stuff");
    expect(result).toContain("Status: active | Progress: 45%");
    expect(result).toContain("Level: Growing (350 pts)");
    expect(result).toContain("- MVP (completed)");
    expect(result).toContain("- Beta (in_progress)");
    expect(result).toContain("- Got the API working");
    expect(result).toContain("Open todos: 2");
  });

  it("returns 'Project not found.' for missing project", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([]);
    mockSelect.mockReturnValueOnce({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const result = await buildProjectContext("missing-id");
    expect(result).toBe("Project not found.");
  });

  it("handles empty milestones, journals, and todos", async () => {
    const projectNoDesc = { ...fakeProject, description: null };

    const mockFrom1 = vi.fn().mockReturnThis();
    const mockWhere1 = vi.fn().mockReturnThis();
    const mockLimit1 = vi.fn().mockResolvedValue([projectNoDesc]);

    const mockFrom2 = vi.fn().mockReturnThis();
    const mockWhere2 = vi.fn().mockReturnThis();
    const mockOrderBy2 = vi.fn().mockReturnThis();
    const mockLimit2 = vi.fn().mockResolvedValue([]);

    const mockFrom3 = vi.fn().mockReturnThis();
    const mockWhere3 = vi.fn().mockReturnThis();
    const mockOrderBy3 = vi.fn().mockReturnThis();
    const mockLimit3 = vi.fn().mockResolvedValue([]);

    const mockFrom4 = vi.fn().mockReturnThis();
    const mockWhere4 = vi.fn().mockResolvedValue([]);

    mockSelect
      .mockReturnValueOnce({
        from: mockFrom1,
        where: mockWhere1,
        limit: mockLimit1,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        orderBy: mockOrderBy2,
        limit: mockLimit2,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
        orderBy: mockOrderBy3,
        limit: mockLimit3,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom4,
        where: mockWhere4,
      } as any);

    const result = await buildProjectContext("proj-1");

    expect(result).toContain("Vision: Not set");
    expect(result).toContain("Milestones:\nNone");
    expect(result).toContain("Recent journal:\nNone");
    expect(result).toContain("Open todos: 0");
  });

  it("uses progressManual when set", async () => {
    const projectManual = { ...fakeProject, progressManual: 80 };

    const mockFrom1 = vi.fn().mockReturnThis();
    const mockWhere1 = vi.fn().mockReturnThis();
    const mockLimit1 = vi.fn().mockResolvedValue([projectManual]);

    const mockFrom2 = vi.fn().mockReturnThis();
    const mockWhere2 = vi.fn().mockReturnThis();
    const mockOrderBy2 = vi.fn().mockReturnThis();
    const mockLimit2 = vi.fn().mockResolvedValue([]);

    const mockFrom3 = vi.fn().mockReturnThis();
    const mockWhere3 = vi.fn().mockReturnThis();
    const mockOrderBy3 = vi.fn().mockReturnThis();
    const mockLimit3 = vi.fn().mockResolvedValue([]);

    const mockFrom4 = vi.fn().mockReturnThis();
    const mockWhere4 = vi.fn().mockResolvedValue([]);

    mockSelect
      .mockReturnValueOnce({
        from: mockFrom1,
        where: mockWhere1,
        limit: mockLimit1,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom2,
        where: mockWhere2,
        orderBy: mockOrderBy2,
        limit: mockLimit2,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom3,
        where: mockWhere3,
        orderBy: mockOrderBy3,
        limit: mockLimit3,
      } as any)
      .mockReturnValueOnce({
        from: mockFrom4,
        where: mockWhere4,
      } as any);

    const result = await buildProjectContext("proj-1");
    expect(result).toContain("Progress: 80%");
  });
});
