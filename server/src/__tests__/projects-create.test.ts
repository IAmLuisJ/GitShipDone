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
  },
}));

// Mock timeline service (non-critical, tested separately)
vi.mock("../services/timelineService", () => ({
  logTimelineEvent: vi.fn(),
}));

import { db } from "../db";

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

function setupTransactionMock(returnValue: any) {
  mockTransaction.mockImplementation(async (cb: any) => {
    const tx = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returnValue]),
        }),
      }),
    };
    return cb(tx);
  });
}

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/projects")
      .send({ name: "Test", type: "software" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing name", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ type: "software" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty name", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "", type: "software" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid type", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Test", type: "invalid-type" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing type", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Test" });
    expect(res.status).toBe(400);
  });

  it("creates project and returns 201", async () => {
    setupTransactionMock(fakeProject);

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "My Project", type: "software" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("My Project");
    expect(res.body.type).toBe("software");
    expect(res.body.status).toBe("active");
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("creates project with optional description", async () => {
    const projectWithDesc = { ...fakeProject, description: "A description" };
    setupTransactionMock(projectWithDesc);

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "My Project",
        type: "software",
        description: "A description",
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("A description");
  });

  it("creates project with milestone templates", async () => {
    const templates = ["MVP", "Beta", "Launch", "Post-Launch", "Growth"];
    let txInsertCalls = 0;

    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => {
          txInsertCalls++;
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([fakeProject]),
            }),
          };
        }),
      };
      return cb(tx);
    });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "My Project",
        type: "software",
        milestoneTemplates: templates,
      });

    expect(res.status).toBe(201);
    // 2 inserts in tx: project, milestones (timeline logged outside tx)
    expect(txInsertCalls).toBe(2);
  });

  it("creates project without milestone templates — only 2 inserts", async () => {
    let txInsertCalls = 0;

    mockTransaction.mockImplementation(async (cb: any) => {
      const tx = {
        insert: vi.fn().mockImplementation(() => {
          txInsertCalls++;
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([fakeProject]),
            }),
          };
        }),
      };
      return cb(tx);
    });

    const res = await request(app)
      .post("/api/projects")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "My Project", type: "software" });

    expect(res.status).toBe(201);
    // 1 insert in tx: project only (timeline logged outside tx)
    expect(txInsertCalls).toBe(1);
  });

  it("accepts all valid project types", async () => {
    const types = [
      "software",
      "design",
      "physical",
      "content",
      "learning",
      "other",
    ];

    for (const type of types) {
      vi.clearAllMocks();
      setupTransactionMock({ ...fakeProject, type });

      const res = await request(app)
        .post("/api/projects")
        .set("Authorization", "Bearer valid-token")
        .send({ name: "Test", type });

      expect(res.status).toBe(201);
    }
  });
});
