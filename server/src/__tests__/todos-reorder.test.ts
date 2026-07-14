 
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

const mockSelect = vi.mocked(db.select);
const mockTransaction = vi.mocked(db.transaction);

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

const TODO_1 = "a0000000-0000-4000-8000-000000000001";
const TODO_2 = "a0000000-0000-4000-8000-000000000002";
const TODO_3 = "a0000000-0000-4000-8000-000000000003";

const fakeTodos = [{ id: TODO_1 }, { id: TODO_2 }, { id: TODO_3 }];

const URL = "/api/projects/project-uuid-1/todos/reorder";

function setupMocks() {
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
    // project todos lookup (returns id only)
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(fakeTodos),
      }),
    } as any;
  });

  // Mock transaction — execute the callback with a mock tx
  mockTransaction.mockImplementation(async (cb: any) => {
    const mockTx = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    };
    await cb(mockTx);
    return undefined;
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

describe("PATCH /api/projects/:id/todos/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(URL).send({ orderedIds: [] });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectNotFound();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ orderedIds: [TODO_1] });
    expect(res.status).toBe(404);
  });

  it("returns 400 if orderedIds is missing", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 if orderedIds contains non-uuid strings", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ orderedIds: ["not-a-uuid"] });
    expect(res.status).toBe(400);
  });

  it("returns 400 if any ID does not belong to the project", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderedIds: [TODO_1, "a0000000-0000-4000-8000-000000000099"],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Some todo IDs do not belong to this project");
  });

  it("returns 200 with correct message on successful reorder", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderedIds: [TODO_3, TODO_1, TODO_2],
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Order updated");
  });

  it("calls transaction with sort_order updates for each todo", async () => {
    setupMocks();
    await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({
        orderedIds: [TODO_3, TODO_1, TODO_2],
      });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for empty orderedIds array", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ orderedIds: [] });
    expect(res.status).toBe(400);
  });
});
