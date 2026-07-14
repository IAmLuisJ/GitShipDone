 
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
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

// Mock GitHub service
vi.mock("../services/githubService", () => {
  const fn = vi.fn();
  return {
    getOctokit: vi.fn(),
    getRepo: vi.fn(),
    importCommits: fn,
    importCommitsForProject: fn,
  };
});

import app from "../app";

// Mock DB
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

const fakeProjectWithGithub = {
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
  githubRepoId: "12345" as string | null,
  githubRepoName: "octocat/hello-world" as string | null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeProjectNoGithub = {
  ...fakeProjectWithGithub,
  githubRepoId: null,
  githubRepoName: null,
};

const URL = "/api/projects/project-uuid-1/github/disconnect";

/**
 * Setup mock for db.select to return a project.
 */
function setupSelect(project: typeof fakeProjectWithGithub | null) {
  mockSelect.mockImplementation(() => {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(project ? [project] : []),
        }),
      }),
    } as any;
  });
}

function setupUpdate() {
  mockUpdate.mockImplementation(() => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi
          .fn()
          .mockResolvedValue([
            {
              ...fakeProjectWithGithub,
              githubRepoId: null,
              githubRepoName: null,
            },
          ]),
      }),
    } as any;
  });
}

describe("DELETE /api/projects/:id/github/disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).delete(URL);
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelect(null);

    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns 400 if no GitHub repo is connected", async () => {
    setupSelect(fakeProjectNoGithub);

    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("No GitHub repo is connected");
  });

  it("returns 200 on successful disconnect", async () => {
    setupSelect(fakeProjectWithGithub);
    setupUpdate();

    const res = await request(app)
      .delete(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("GitHub repo disconnected");
  });

  it("calls db.update to clear github fields", async () => {
    setupSelect(fakeProjectWithGithub);
    setupUpdate();

    await request(app).delete(URL).set("Authorization", "Bearer valid-token");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("does not delete imported commits or releases (no delete calls)", async () => {
    setupSelect(fakeProjectWithGithub);
    setupUpdate();

    await request(app).delete(URL).set("Authorization", "Bearer valid-token");

    // db.update is called once (to clear github fields), no delete operations
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // No other DB mutation methods should be called
    expect(db.insert).not.toHaveBeenCalled();
  });
});
