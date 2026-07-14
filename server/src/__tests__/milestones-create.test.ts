 
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

const fakeMilestone = {
  id: "milestone-uuid-1",
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
 * Sets up select mock to return project for ownership check,
 * then max sort order for milestone ordering.
 */
function setupMocks(maxSortOrder: number | null = null) {
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
    // max sort order call
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxOrder: maxSortOrder }]),
      }),
    } as any;
  });

  mockInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([fakeMilestone]),
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

describe("POST /api/projects/:id/milestones", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .send({ name: "MVP" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();

    const res = await request(app)
      .post("/api/projects/project-uuid-999/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "MVP" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing name", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty name", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "" });
    expect(res.status).toBe(400);
  });

  it("creates milestone with sort_order 0 when no existing milestones", async () => {
    setupMocks(null);

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "MVP" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("MVP");
    expect(mockInsert).toHaveBeenCalledOnce();

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 0 }),
    );
  });

  it("creates milestone with sort_order = max + 1 when milestones exist", async () => {
    setupMocks(2);

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Beta" });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ sortOrder: 3 }),
    );
  });

  it("creates milestone with optional fields", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "MVP",
        description: "First release",
        dueDate: "2026-04-01T00:00:00.000Z",
        status: "in_progress",
      });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "First release",
        dueDate: "2026-04-01T00:00:00.000Z",
        status: "in_progress",
      }),
    );
  });

  it("defaults status to pending when not provided", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "MVP" });

    expect(res.status).toBe(201);

    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" }),
    );
  });

  it("returns 400 for invalid status value", async () => {
    setupMocks();

    const res = await request(app)
      .post("/api/projects/project-uuid-1/milestones")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "MVP", status: "invalid" });
    expect(res.status).toBe(400);
  });
});
