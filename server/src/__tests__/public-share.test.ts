 
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock rate limiters
vi.mock("../middleware/rateLimit", () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    loginLimiter: passthrough,
    registerLimiter: passthrough,
    forgotPasswordLimiter: passthrough,
  };
});

// Mock JWT verification
vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn(() => "mock-access-token"),
  signRefreshToken: vi.fn(() => "mock-refresh-token"),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === "valid-token") return { sub: "user-uuid-123" };
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

// Mock GitHub service
vi.mock("../services/githubService", () => ({
  getOctokit: vi.fn(),
  getRepo: vi.fn(),
  importCommits: vi.fn(),
  importCommitsForProject: vi.fn(),
}));

import app from "../app";

// Mock DB
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

const fakeProject = {
  id: "project-uuid-1",
  name: "My Project",
  type: "software",
  description: "A test project",
  status: "active",
  progressAuto: 25,
  progressManual: null,
  pointsTotal: 100,
  level: "Sprout",
  createdAt: new Date("2026-01-01"),
};

const fakeMilestones = [
  {
    id: "ms-1",
    projectId: "project-uuid-1",
    name: "MVP",
    description: null,
    status: "pending",
    dueDate: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fakeTodos = [
  {
    id: "todo-1",
    projectId: "project-uuid-1",
    milestoneId: null,
    title: "Setup CI",
    isCompleted: false,
    isUrgent: false,
    dueDate: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const fakeJournal = [
  {
    id: "j-1",
    projectId: "project-uuid-1",
    title: "Day 1",
    body: "Started building",
    mood: "excited",
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  },
];

const fakeTimeline = [
  {
    id: "tl-1",
    projectId: "project-uuid-1",
    type: "journal",
    refId: "j-1",
    payload: {},
    createdAt: new Date(),
  },
];

/**
 * Build a mock chain for db.select() calls.
 * First call returns the project, subsequent calls return related data.
 */
function setupSelectCalls(
  project: typeof fakeProject | null,
  related: {
    milestones?: any[];
    todos?: any[];
    journal?: any[];
    timeline?: any[];
  } = {},
) {
  let callCount = 0;

  mockSelect.mockImplementation(() => {
    callCount++;

    // First call: project lookup (uses select with specific fields)
    if (callCount === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(project ? [project] : []),
        }),
      } as any;
    }

    // Subsequent calls: milestones, todos, journal, timeline
    const datasets = [
      related.milestones ?? fakeMilestones,
      related.todos ?? fakeTodos,
      related.journal ?? fakeJournal,
      related.timeline ?? fakeTimeline,
    ];

    const data = datasets[callCount - 2] ?? [];

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue(data),
            // If no .limit() is called, resolve directly
            then: (resolve: any) => resolve(data),
          })),
          limit: vi.fn().mockResolvedValue(data),
        }),
      }),
    } as any;
  });
}

describe("GET /api/share/:token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for invalid token", async () => {
    setupSelectCalls(null);

    const res = await request(app).get("/api/share/invalid-token-uuid");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("does NOT require authentication", async () => {
    setupSelectCalls(fakeProject);

    const res = await request(app).get("/api/share/valid-token-uuid");
    // Should not be 401 — should be 200 since no auth needed
    expect(res.status).toBe(200);
  });

  it("returns 200 with project data for valid public token", async () => {
    setupSelectCalls(fakeProject);

    const res = await request(app).get("/api/share/valid-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body.project).toBeDefined();
    expect(res.body.project.name).toBe("My Project");
    expect(res.body.project.type).toBe("software");
    expect(res.body.project.status).toBe("active");
    expect(res.body.project.pointsTotal).toBe(100);
    expect(res.body.project.level).toBe("Sprout");
    expect(res.body.project.progressAuto).toBe(25);
  });

  it("returns milestones, todos, journalEntries, and timeline", async () => {
    setupSelectCalls(fakeProject);

    const res = await request(app).get("/api/share/valid-token-uuid");

    expect(res.status).toBe(200);
    expect(res.body.milestones).toBeDefined();
    expect(Array.isArray(res.body.milestones)).toBe(true);
    expect(res.body.todos).toBeDefined();
    expect(Array.isArray(res.body.todos)).toBe(true);
    expect(res.body.journalEntries).toBeDefined();
    expect(Array.isArray(res.body.journalEntries)).toBe(true);
    expect(res.body.timeline).toBeDefined();
    expect(Array.isArray(res.body.timeline)).toBe(true);
  });

  it("does NOT return sensitive fields (user email, github tokens, AI chat)", async () => {
    setupSelectCalls(fakeProject);

    const res = await request(app).get("/api/share/valid-token-uuid");

    expect(res.status).toBe(200);
    const project = res.body.project;
    expect(project.userId).toBeUndefined();
    expect(project.shareToken).toBeUndefined();
    expect(project.isPublic).toBeUndefined();
    expect(project.githubRepoId).toBeUndefined();
    expect(project.githubRepoName).toBeUndefined();
    expect(project.deletedAt).toBeUndefined();
  });

  it("returns 404 when project is not found (private or bad token)", async () => {
    setupSelectCalls(null);

    const res = await request(app).get(
      "/api/share/00000000-0000-0000-0000-000000000000",
    );
    expect(res.status).toBe(404);
  });
});
