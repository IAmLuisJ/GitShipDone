 
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
    update: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "Project Alpha",
  description: "A test project",
  type: "software",
  status: "active",
  progressAuto: 0,
  progressManual: null,
  pointsTotal: 0,
  level: "Seed",
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

function setupUpdateMock() {
  mockUpdate.mockImplementation(
    () =>
      ({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }) as any,
  );
}

describe("DELETE /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).delete("/api/projects/project-uuid-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent project", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .delete("/api/projects/nonexistent-id")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });

  it("returns 404 for project belonging to different user", async () => {
    setupOwnershipMock(null);

    const res = await request(app)
      .delete("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer other-user-token");

    expect(res.status).toBe(404);
  });

  it("returns 200 and soft deletes the project", async () => {
    setupOwnershipMock(fakeProject);
    setupUpdateMock();

    const res = await request(app)
      .delete("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Project deleted" });
  });

  it("calls db.update with deletedAt set", async () => {
    setupOwnershipMock(fakeProject);
    setupUpdateMock();

    await request(app)
      .delete("/api/projects/project-uuid-1")
      .set("Authorization", "Bearer valid-token");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 404 for already soft-deleted project", async () => {
    // getOwnedProject filters out deleted projects
    setupOwnershipMock(null);

    const res = await request(app)
      .delete("/api/projects/deleted-project-id")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Project not found");
  });
});
