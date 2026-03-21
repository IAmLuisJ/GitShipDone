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

/**
 * Set up the select mock for getOwnedProject.
 */
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

/**
 * Set up the update mock to return the updated project.
 */
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

/**
 * Set up the insert mock for timeline events.
 */
function setupInsertMock() {
  mockInsert.mockImplementation(
    () =>
      ({
        values: vi.fn().mockResolvedValue(undefined),
      }) as any,
  );
}

describe("PATCH /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .send({ name: "New Name" });

    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .patch("/api/projects/nonexistent-id")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns 404 for project belonging to different user", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer other-user-token")
      .send({ name: "New Name" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No fields to update");
  });

  it("returns 400 for invalid field values", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 200 with updated project when name changes", async () => {
    const updatedProject = { ...fakeProject, name: "New Name" };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
    // No timeline event for name change
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("logs status_change timeline event when status changes", async () => {
    const updatedProject = { ...fakeProject, status: "completed" };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);
    setupInsertMock();

    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "completed" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("completed");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertValues = mockInsert.mock.results[0].value.values;
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-uuid-1",
        type: "status_change",
        payload: { from: "active", to: "completed" },
      }),
    );
  });

  it("does not log timeline event when status stays the same", async () => {
    const updatedProject = { ...fakeProject };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "active" });

    expect(res.status).toBe(200);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid status value", async () => {
    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "invalid_status" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("updates multiple fields at once", async () => {
    const updatedProject = {
      ...fakeProject,
      name: "Renamed",
      description: "Updated desc",
      type: "design",
    };
    setupOwnershipMock(fakeProject);
    setupUpdateMock(updatedProject);

    const res = await request(app)
      .patch("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Renamed", description: "Updated desc", type: "design" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed");
    expect(res.body.description).toBe("Updated desc");
    expect(res.body.type).toBe("design");
  });
});
