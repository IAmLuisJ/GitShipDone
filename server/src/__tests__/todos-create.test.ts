 
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
  recalculateProgress: vi.fn().mockResolvedValue(0),
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);

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

const MILESTONE_UUID = "00000000-0000-4000-8000-000000000001";
const MILESTONE_UUID_MISSING = "00000000-0000-4000-8000-000000000099";

const fakeMilestone = {
  id: MILESTONE_UUID,
  projectId: "project-uuid-1",
  name: "MVP",
  description: null,
  status: "pending",
  dueDate: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/**
 * Sets up select mock for: ownership check, optional milestone check, max sort order.
 */
function setupMocks(
  opts: {
    maxSortOrder?: number | null;
    milestoneExists?: boolean;
    withMilestoneCheck?: boolean;
  } = {},
) {
  const {
    maxSortOrder = null,
    milestoneExists = true,
    withMilestoneCheck = false,
  } = opts;
  let selectCallCount = 0;

  mockSelect.mockImplementation(() => {
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
    if (withMilestoneCheck && selectCallCount === 2) {
      // milestone existence check
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue(milestoneExists ? [fakeMilestone] : []),
          }),
        }),
      } as any;
    }
    // max sort order call
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxOrder: maxSortOrder }]),
      }),
    } as any;
  });

  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([fakeTodo]),
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

describe("POST /api/projects/:id/todos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .send({ title: "Write tests" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();

    const res = await request(app)
      .post("/api/projects/project-uuid-999/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Write tests" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing title", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty title", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("creates todo with sort_order 0 when no existing todos", async () => {
    setupMocks({ maxSortOrder: null });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Write tests" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Write tests");
    expect(mockInsert).toHaveBeenCalledOnce();

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 0 }),
    );
  });

  it("creates todo with sort_order = max + 1 when todos exist", async () => {
    setupMocks({ maxSortOrder: 2 });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Another todo" });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 3 }),
    );
  });

  it("creates todo with optional fields", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({
        title: "Urgent task",
        dueDate: "2026-04-01",
        isUrgent: true,
      });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Urgent task",
        dueDate: "2026-04-01",
        isUrgent: true,
      }),
    );
  });

  it("creates todo linked to a milestone", async () => {
    setupMocks({ withMilestoneCheck: true, milestoneExists: true });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Task under MVP", milestoneId: MILESTONE_UUID });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ milestoneId: MILESTONE_UUID }),
    );
  });

  it("returns 404 if milestone not found in project", async () => {
    setupMocks({ withMilestoneCheck: true, milestoneExists: false });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Task", milestoneId: MILESTONE_UUID_MISSING });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Milestone not found in this project");
  });

  it("returns 400 for invalid milestoneId format", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Task", milestoneId: "not-a-uuid" });

    expect(res.status).toBe(400);
  });

  it("calls recalculateProgress after creation", async () => {
    setupMocks();

    const { recalculateProgress } = await import("../services/progressService");

    const res = await request(app)
      .post("/api/projects/project-uuid-1/todos")
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Write tests" });

    expect(res.status).toBe(201);
    expect(recalculateProgress).toHaveBeenCalledWith("project-uuid-1");
  });
});
