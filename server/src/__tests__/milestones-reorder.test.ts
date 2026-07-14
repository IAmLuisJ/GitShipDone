 
import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";

vi.mock("../middleware/rateLimit", () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    loginLimiter: passthrough,
    registerLimiter: passthrough,
    forgotPasswordLimiter: passthrough,
  };
});

vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn(() => "mock-access-token"),
  signRefreshToken: vi.fn(() => "mock-refresh-token"),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === "valid-token") return { sub: "user-uuid-123" };
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock("../services/progressService", () => ({
  recalculateProgress: vi.fn().mockResolvedValue(0),
}));

vi.mock("../services/pointsService", () => ({
  awardPoints: vi.fn().mockResolvedValue({
    newTotal: 10,
    level: "Seed",
    didLevelUp: false,
  }),
}));

import app from "../app";
import { db } from "../db";

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

const milestones = [
  { id: "milestone-1", name: "Plan", sortOrder: 0 },
  { id: "milestone-2", name: "Build", sortOrder: 1 },
  { id: "milestone-3", name: "Launch", sortOrder: 2 },
];

const URL = "/api/projects/project-uuid-1/milestones/reorder";

function setupMocks() {
  let selectCallCount = 0;

  mockSelect.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([fakeProject]),
          }),
        }),
      } as any;
    }

    if (selectCallCount === 2) {
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(milestones.map(({ id }) => ({ id }))),
        }),
      } as any;
    }

    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(milestones),
        }),
      }),
    } as any;
  });

  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  } as any);
}

describe("PATCH /api/projects/:id/milestones/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(URL).send({ milestoneIds: [] });
    expect(res.status).toBe(401);
  });

  it("returns 400 if milestoneIds is missing", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 if an ID does not belong to the project", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ milestoneIds: ["milestone-2", "other-milestone"] });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid milestone order");
  });

  it("updates each milestone sort order and returns the reordered list", async () => {
    setupMocks();
    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ milestoneIds: ["milestone-2", "milestone-1", "milestone-3"] });

    expect(res.status).toBe(200);
    expect(res.body.milestones).toEqual(milestones);
    expect(mockUpdate).toHaveBeenCalledTimes(3);
  });
});
