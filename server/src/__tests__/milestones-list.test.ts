/* eslint-disable @typescript-eslint/no-explicit-any */
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

// Mock JWT verification to set req.userId
vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn(() => "mock-access-token"),
  signRefreshToken: vi.fn(() => "mock-refresh-token"),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === "valid-token") return { sub: "user-uuid-123" };
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
    update: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "My Project",
  description: null,
  type: "software",
  status: "active",
  progressAuto: 0,
  progressManual: null,
  pointsTotal: 0,
  level: "Seed",
  shareToken: null,
  isPublic: false,
  githubRepoId: null,
  githubRepoName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeMilestones = [
  {
    id: "milestone-uuid-1",
    projectId: "project-uuid-1",
    name: "Alpha",
    description: null,
    status: "pending",
    dueDate: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "milestone-uuid-2",
    projectId: "project-uuid-1",
    name: "Beta",
    description: "Second milestone",
    status: "in_progress",
    dueDate: null,
    sortOrder: 1,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "milestone-uuid-3",
    projectId: "project-uuid-1",
    name: "Launch",
    description: null,
    status: "pending",
    dueDate: null,
    sortOrder: 2,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Sets up select mock: first call returns project (ownership check),
 * second call returns milestones list.
 */
function setupMocks(milestonesList: any[] = fakeMilestones) {
  let selectCallCount = 0;
  mockSelect.mockImplementation((_fields?: any) => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // getOwnedProject call
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([fakeProject]),
          }),
        }),
      } as any;
    }
    // milestones list call
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(milestonesList),
        }),
      }),
    } as any;
  });
}

function setupProjectNotFound() {
  mockSelect.mockImplementation(() => {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id/milestones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get(
      "/api/projects/project-uuid-1/milestones",
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();

    const res = await request(app)
      .get("/api/projects/project-uuid-999/milestones")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns milestones ordered by sort_order ASC", async () => {
    setupMocks();

    const res = await request(app)
      .get("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].name).toBe("Alpha");
    expect(res.body[1].name).toBe("Beta");
    expect(res.body[2].name).toBe("Launch");
  });

  it("returns empty array when no milestones exist", async () => {
    setupMocks([]);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns milestone fields correctly", async () => {
    setupMocks();

    const res = await request(app)
      .get("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    const milestone = res.body[1];
    expect(milestone.id).toBe("milestone-uuid-2");
    expect(milestone.name).toBe("Beta");
    expect(milestone.description).toBe("Second milestone");
    expect(milestone.status).toBe("in_progress");
    expect(milestone.sortOrder).toBe(1);
  });
});
