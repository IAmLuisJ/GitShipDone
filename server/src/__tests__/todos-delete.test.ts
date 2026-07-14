 
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
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock progressService
vi.mock("../services/progressService", () => ({
  recalculateProgress: vi.fn().mockResolvedValue(0),
}));

// Mock pointsService
vi.mock("../services/pointsService", () => ({
  awardPoints: vi.fn().mockResolvedValue({
    newTotal: 10,
    level: "Seed",
    didLevelUp: false,
  }),
}));

import { db } from "../db";
import { recalculateProgress } from "../services/progressService";

const mockSelect = vi.mocked(db.select);
const mockDelete = vi.mocked(db.delete);

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

const fakeTodo = {
  id: "todo-uuid-1",
  projectId: "project-uuid-1",
  milestoneId: null,
  title: "Write tests",
  isCompleted: false,
  isUrgent: false,
  dueDate: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const URL = "/api/projects/project-uuid-1/todos/todo-uuid-1";

/**
 * Setup select mocks for ownership check and todo lookup.
 */
function setupMocks(opts: { todoExists?: boolean } = {}) {
  const { todoExists = true } = opts;
  let selectCallCount = 0;

  mockSelect.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // getOwnedProject
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([fakeProject]),
          }),
        }),
      } as any;
    }
    // todo lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(
            todoExists ? [fakeTodo] : [],
          ),
        }),
      }),
    } as any;
  });

  mockDelete.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  } as any);
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

describe("DELETE /api/projects/:id/todos/:tid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).delete(URL);
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();
    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns 404 if todo not found", async () => {
    setupMocks({ todoExists: false });
    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Todo not found");
  });

  it("returns 200 on successful deletion", async () => {
    setupMocks();
    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Todo deleted");
    expect(res.body).toHaveProperty("progress");
  });

  it("calls db.delete with correct todo", async () => {
    setupMocks();
    await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("recalculates progress after deletion", async () => {
    setupMocks();
    vi.mocked(recalculateProgress).mockResolvedValue(75 as any);
    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(recalculateProgress).toHaveBeenCalledWith("project-uuid-1");
    expect(res.body.progress).toBe(75);
  });
});
