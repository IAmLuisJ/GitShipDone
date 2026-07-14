 
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

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock awardPoints
vi.mock("../services/pointsService", () => ({
  awardPoints: vi.fn(),
}));

import app from "../app";
import { db } from "../db";
import { awardPoints } from "../services/pointsService";

const mockSelect = vi.mocked(db.select);
const mockAwardPoints = vi.mocked(awardPoints);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "Project Alpha",
  description: "A test project",
  type: "software",
  status: "active",
  progressAuto: 0,
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

const fakePointsLog = [
  {
    id: "log-1",
    projectId: "project-uuid-1",
    delta: 10,
    reason: "Completed todo: Wire OAuth",
    source: "todo",
    createdAt: new Date("2026-05-24T12:00:00.000Z"),
  },
  {
    id: "log-2",
    projectId: "project-uuid-1",
    delta: -5,
    reason: "Unchecked todo: Polish copy",
    source: "todo",
    createdAt: new Date("2026-05-24T11:00:00.000Z"),
  },
];

function setupOwnershipMock(project: any | null) {
  mockSelect.mockImplementation(
    () =>
      ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(project ? [project] : []),
          }),
        }),
      }) as any,
  );
}

function setupPointsLogMock(project: any | null, logRows = fakePointsLog) {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(project ? [project] : []),
          }),
        }),
      } as any;
    }

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(logRows),
          }),
        }),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id/points-log", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/projects/project-uuid-1/points-log");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupPointsLogMock(null);

    const res = await request(app)
      .get("/api/projects/nonexistent-id/points-log")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns the last five point transactions", async () => {
    setupPointsLogMock(fakeProject);

    const res = await request(app)
      .get("/api/projects/project-uuid-1/points-log")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      id: "log-1",
      delta: 10,
      reason: "Completed todo: Wire OAuth",
      source: "todo",
    });
  });
});

describe("POST /api/projects/:id/points", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .send({ delta: 100, reason: "Bonus" });
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .post("/api/projects/nonexistent-id/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 100, reason: "Bonus" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns 400 when reason is missing", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when delta is missing", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ reason: "Just because" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when delta exceeds +500", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 501, reason: "Too many" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when delta is below -500", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: -501, reason: "Too few" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when reason is empty string", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 10, reason: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when reason exceeds 255 chars", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 10, reason: "a".repeat(256) });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 200 with updated pointsTotal and level for positive delta", async () => {
    setupOwnershipMock(fakeProject);
    mockAwardPoints.mockResolvedValue({
      newTotal: 200,
      level: "Sprout",
      didLevelUp: false,
    });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 100, reason: "Bonus points" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      pointsTotal: 200,
      level: "Sprout",
      didLevelUp: false,
    });
    expect(mockAwardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      100,
      "Bonus points",
      "manual",
    );
  });

  it("returns 200 with floored total for negative delta", async () => {
    setupOwnershipMock(fakeProject);
    mockAwardPoints.mockResolvedValue({
      newTotal: 0,
      level: "Seed",
      didLevelUp: false,
    });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: -200, reason: "Penalty" });

    expect(res.status).toBe(200);
    expect(res.body.pointsTotal).toBe(0);
    expect(mockAwardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      -200,
      "Penalty",
      "manual",
    );
  });

  it("returns didLevelUp true when level changes", async () => {
    setupOwnershipMock(fakeProject);
    mockAwardPoints.mockResolvedValue({
      newTotal: 500,
      level: "Growing",
      didLevelUp: true,
    });

    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 400, reason: "Big milestone" });

    expect(res.status).toBe(200);
    expect(res.body.didLevelUp).toBe(true);
    expect(res.body.level).toBe("Growing");
  });

  it("returns 400 for non-integer delta", async () => {
    const res = await request(app)
      .post("/api/projects/project-uuid-1/points")
      .set("Authorization", "Bearer valid-token")
      .send({ delta: 10.5, reason: "Fractional" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });
});
