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

const fakeTodos = [
  {
    id: "todo-uuid-1",
    projectId: "project-uuid-1",
    milestoneId: "milestone-uuid-1",
    title: "First todo",
    isCompleted: false,
    isUrgent: false,
    dueDate: null,
    sortOrder: 0,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "todo-uuid-2",
    projectId: "project-uuid-1",
    milestoneId: null,
    title: "Second todo",
    isCompleted: true,
    isUrgent: true,
    dueDate: null,
    sortOrder: 1,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "todo-uuid-3",
    projectId: "project-uuid-1",
    milestoneId: "milestone-uuid-1",
    title: "Third todo",
    isCompleted: true,
    isUrgent: false,
    dueDate: null,
    sortOrder: 2,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Sets up select mock: first call returns project (ownership check),
 * second call returns todos list (optionally filtered).
 */
function setupMocks(todosList: any[] = fakeTodos) {
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
    // todos list call
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(todosList),
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

describe("GET /api/projects/:id/todos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/projects/project-uuid-1/todos");
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();

    const res = await request(app)
      .get("/api/projects/project-uuid-999/todos")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns all todos ordered by sort_order ASC", async () => {
    setupMocks();

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe("First todo");
    expect(res.body[1].title).toBe("Second todo");
    expect(res.body[2].title).toBe("Third todo");
  });

  it("returns empty array when no todos exist", async () => {
    setupMocks([]);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("accepts ?completed=true filter", async () => {
    const completedOnly = fakeTodos.filter((t) => t.isCompleted);
    setupMocks(completedOnly);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos?completed=true")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((t: any) => t.isCompleted)).toBe(true);
  });

  it("accepts ?completed=false filter", async () => {
    const incompleteOnly = fakeTodos.filter((t) => !t.isCompleted);
    setupMocks(incompleteOnly);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos?completed=false")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].isCompleted).toBe(false);
  });

  it("accepts ?milestoneId filter", async () => {
    const milestoneOnly = fakeTodos.filter(
      (t) => t.milestoneId === "milestone-uuid-1",
    );
    setupMocks(milestoneOnly);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos?milestoneId=milestone-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(
      res.body.every((t: any) => t.milestoneId === "milestone-uuid-1"),
    ).toBe(true);
  });

  it("returns todo fields correctly", async () => {
    setupMocks();

    const res = await request(app)
      .get("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    const todo = res.body[0];
    expect(todo.id).toBe("todo-uuid-1");
    expect(todo.title).toBe("First todo");
    expect(todo.milestoneId).toBe("milestone-uuid-1");
    expect(todo.isCompleted).toBe(false);
    expect(todo.isUrgent).toBe(false);
    expect(todo.sortOrder).toBe(0);
  });
});
