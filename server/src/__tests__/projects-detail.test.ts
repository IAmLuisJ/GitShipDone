 
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
    if (token === "other-user-token") return { sub: "user-uuid-456" };
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "Project Alpha",
  description: "A test project",
  type: "software",
  status: "active",
  progressAuto: 25,
  progressManual: null,
  pointsTotal: 100,
  level: "Sprout",
  isPublic: false,
  shareToken: null,
  githubRepoUrl: null,
  githubAccessToken: null,
  visionStatement: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeMilestones = [
  { id: "milestone-1", projectId: "project-uuid-1", name: "MVP", sortOrder: 0 },
  {
    id: "milestone-2",
    projectId: "project-uuid-1",
    name: "Beta",
    sortOrder: 1,
  },
];

const fakeTodos = [
  {
    id: "todo-1",
    projectId: "project-uuid-1",
    title: "Setup CI",
    sortOrder: 0,
  },
];

/**
 * Set up the chained select mock.
 * The first call returns the project lookup (getOwnedProject),
 * the second and third calls return milestones and todos.
 */
function setupDetailMocks(
  project: any | null,
  milestonesData: any[] = [],
  todosData: any[] = [],
) {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // getOwnedProject call
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(project ? [project] : []),
          }),
        }),
      } as any;
    }
    if (callCount === 2) {
      // milestones fetch
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(milestonesData),
          }),
        }),
      } as any;
    }
    // todos fetch
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(todosData),
        }),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/projects/project-uuid-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupDetailMocks(null);

    const res = await request(app)
      .get("/api/projects/nonexistent-id")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns 404 for project belonging to different user", async () => {
    // The ownership check filters by userId, so another user's project won't be found
    setupDetailMocks(null);

    const res = await request(app)
      .get("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer other-user-token");

    expect(res.status).toBe(404);
  });

  it("returns 200 with project, milestones, and todos", async () => {
    setupDetailMocks(fakeProject, fakeMilestones, fakeTodos);

    const res = await request(app)
      .get("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("project-uuid-1");
    expect(res.body.name).toBe("Project Alpha");
    expect(res.body.milestones).toHaveLength(2);
    expect(res.body.todos).toHaveLength(1);
  });

  it("includes all expected project fields in response", async () => {
    setupDetailMocks(fakeProject, [], []);

    const res = await request(app)
      .get("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("name");
    expect(res.body).toHaveProperty("type");
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("progressAuto");
    expect(res.body).toHaveProperty("pointsTotal");
    expect(res.body).toHaveProperty("level");
    expect(res.body).toHaveProperty("milestones");
    expect(res.body).toHaveProperty("todos");
  });

  it("returns empty milestones and todos arrays when project has none", async () => {
    setupDetailMocks(fakeProject, [], []);

    const res = await request(app)
      .get("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.milestones).toEqual([]);
    expect(res.body.todos).toEqual([]);
  });

  it("returns 404 for soft-deleted project", async () => {
    // getOwnedProject filters by deletedAt IS NULL, so deleted project won't be found
    setupDetailMocks(null);

    const res = await request(app)
      .get("/api/projects/deleted-project-id")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });
});
