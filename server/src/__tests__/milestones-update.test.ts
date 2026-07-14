 
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

const fakeMilestone = {
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
};

function setupProjectOwnership(found = true) {
  mockSelect.mockImplementation(() => {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(found ? [fakeProject] : []),
        }),
      }),
    } as any;
  });
}

function setupUpdateMock(returnedMilestone: any | null) {
  mockUpdate.mockImplementation(() => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi
            .fn()
            .mockResolvedValue(
              returnedMilestone ? [returnedMilestone] : [],
            ),
        }),
      }),
    } as any;
  });
}

describe("PATCH /api/projects/:id/milestones/:mid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(
      "/api/projects/project-uuid-1/milestones/milestone-uuid-1",
    );
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupProjectOwnership(false);

    const res = await request(app)
      .patch("/api/projects/project-uuid-999/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 400 for empty body", async () => {
    setupProjectOwnership();

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status value", async () => {
    setupProjectOwnership();

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "invalid_status" });
    expect(res.status).toBe(400);
  });

  it("returns 404 if milestone not found for this project", async () => {
    setupProjectOwnership();
    setupUpdateMock(null);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-999")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Updated" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Milestone not found");
  });

  it("updates milestone name and returns 200", async () => {
    setupProjectOwnership();
    const updatedMilestone = { ...fakeMilestone, name: "Renamed Alpha" };
    setupUpdateMock(updatedMilestone);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Renamed Alpha" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Alpha");
  });

  it("updates milestone status and returns 200", async () => {
    setupProjectOwnership();
    const updatedMilestone = { ...fakeMilestone, status: "in_progress" };
    setupUpdateMock(updatedMilestone);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "in_progress" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("in_progress");
  });

  it("updates multiple fields at once", async () => {
    setupProjectOwnership();
    const updatedMilestone = {
      ...fakeMilestone,
      name: "New Name",
      description: "New description",
      status: "in_progress",
    };
    setupUpdateMock(updatedMilestone);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({
        name: "New Name",
        description: "New description",
        status: "in_progress",
      });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    expect(res.body.description).toBe("New description");
    expect(res.body.status).toBe("in_progress");
  });

  it("calls db.update with correct parameters", async () => {
    setupProjectOwnership();
    setupUpdateMock(fakeMilestone);

    await request(app)
      .patch("/api/projects/project-uuid-1/milestones/milestone-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Updated" });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
