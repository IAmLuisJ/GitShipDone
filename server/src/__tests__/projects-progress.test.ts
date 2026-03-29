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

import { db } from "../db";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockInsert = vi.mocked(db.insert);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "Project Alpha",
  description: "A test project",
  type: "software",
  status: "active",
  progressAuto: 25,
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

function setupUpdateMock(updatedProject: any) {
  mockUpdate.mockImplementation(
    () =>
      ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedProject]),
          }),
        }),
      }) as any,
  );
}

function setupInsertMock() {
  mockInsert.mockImplementation(
    () =>
      ({
        values: vi.fn().mockResolvedValue(undefined),
      }) as any,
  );
}

describe("PATCH /api/projects/:id/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .send({ progressManual: 75 });

    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .patch("/api/projects/nonexistent-id/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: 75 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns 400 for progressManual > 100", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: 150 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for progressManual < 0", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for non-integer progressManual", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: 50.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 when progressManual is missing", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("sets progressManual to 75 and returns both progress values", async () => {
    const updatedProject = { ...fakeProject, progressManual: 75 };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);
    setupInsertMock();

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: 75 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      progressAuto: 25,
      progressManual: 75,
    });
  });

  it("clears progressManual when null is sent", async () => {
    const projectWithManual = { ...fakeProject, progressManual: 75 };
    const updatedProject = { ...fakeProject, progressManual: null };
    setupOwnershipMock(projectWithManual);
    setupUpdateMock(updatedProject);
    setupInsertMock();

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: null });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      progressAuto: 25,
      progressManual: null,
    });
  });

  it("logs a progress_change timeline event", async () => {
    const updatedProject = { ...fakeProject, progressManual: 50 };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);
    setupInsertMock();

    await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer valid-token")
      .send({ progressManual: 50 });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-uuid-1",
        type: "progress_change",
        payload: { isManual: true, to: 50 },
      }),
    );
  });

  it("returns 404 for project belonging to different user", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1/progress")
      .set("Authorization", "Bearer other-user-token")
      .send({ progressManual: 50 });

    expect(res.status).toBe(404);
  });
});
