 
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
    transaction: vi.fn(),
  },
}));

// Mock progressService
vi.mock("../services/progressService", () => ({
  recalculateProgress: vi.fn().mockResolvedValue(50),
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
import { awardPoints } from "../services/pointsService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

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
function setupMocks(opts: { todoExists?: boolean; todoOverrides?: any } = {}) {
  const { todoExists = true, todoOverrides = {} } = opts;
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
            todoExists ? [{ ...fakeTodo, ...todoOverrides }] : [],
          ),
        }),
      }),
    } as any;
  });

  const updatedTodo = { ...fakeTodo, ...todoOverrides };
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedTodo]),
      }),
    }),
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

describe("PATCH /api/projects/:id/todos/:tid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(URL).send({ title: "Updated" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty body", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 404 if todo not found", async () => {
    setupMocks({ todoExists: false });
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Todo not found");
  });

  it("updates title without affecting points", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated title" });

    expect(res.status).toBe(200);
    expect(res.body.todo).toBeDefined();
    expect(res.body.progress).toBe(50);
    expect(awardPoints).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("awards +10 points when completing a todo", async () => {
    setupMocks({ todoOverrides: { isCompleted: false } });
    vi.mocked(awardPoints).mockResolvedValueOnce({
      newTotal: 300,
      level: "Growing",
      didLevelUp: true,
    });
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ isCompleted: true });

    expect(res.status).toBe(200);
    expect(awardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      10,
      "Completed todo: Write tests",
      "todo",
    );
    expect(recalculateProgress).toHaveBeenCalledWith("project-uuid-1");
    expect(res.body.didLevelUp).toBe(true);
    expect(res.body.newLevel).toBe("Growing");
  });

  it("deducts -10 points when uncompleting a todo", async () => {
    setupMocks({
      todoOverrides: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ isCompleted: false });

    expect(res.status).toBe(200);
    expect(awardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      -10,
      "Unchecked todo: Write tests",
      "todo",
    );
    expect(res.body.didLevelUp).toBe(false);
    expect(res.body.newLevel).toBe("Seed");
  });

  it("does not award points when already completed and isCompleted: true", async () => {
    setupMocks({
      todoOverrides: {
        isCompleted: true,
        completedAt: new Date(),
      },
    });
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ isCompleted: true });

    expect(res.status).toBe(200);
    expect(awardPoints).not.toHaveBeenCalled();
  });

  it("recalculates progress after update", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ isUrgent: true });

    expect(res.status).toBe(200);
    expect(recalculateProgress).toHaveBeenCalledWith("project-uuid-1");
    expect(res.body.progress).toBe(50);
  });

  it("updates multiple fields at once", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "New title", isUrgent: true, dueDate: "2026-04-01" });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });

  it("allows clearing dueDate with null", async () => {
    setupMocks({ todoOverrides: { dueDate: "2026-04-01" } });
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ dueDate: null });

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledOnce();
  });
});
