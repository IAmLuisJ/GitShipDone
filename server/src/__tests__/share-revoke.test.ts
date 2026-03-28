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
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

// Mock GitHub service
vi.mock("../services/githubService", () => ({
  getOctokit: vi.fn(),
  getRepo: vi.fn(),
  importCommits: vi.fn(),
  importCommitsForProject: vi.fn(),
}));

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
  shareToken: "old-token-uuid",
  isPublic: true,
  githubRepoId: null,
  githubRepoName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const URL = "/api/projects/project-uuid-1/share/revoke";

function setupSelect(project: typeof fakeProject | null) {
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
        where: vi.fn().mockResolvedValue([{ ...fakeProject, isPublic: false }]),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/share/revoke", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post(URL);
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelect(null);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns 200 with revoke message", async () => {
    setupSelect(fakeProject);
    setupUpdate();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Share link revoked");
  });

  it("calls db.update to set isPublic false and new shareToken", async () => {
    setupSelect(fakeProject);
    setupUpdate();

    await request(app).post(URL).set("Authorization", "Bearer valid-token");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("generates a new token different from the old one", async () => {
    setupSelect(fakeProject);

    let capturedSet: any = null;
    mockUpdate.mockImplementation(() => {
      return {
        set: vi.fn().mockImplementation((setArg: any) => {
          capturedSet = setArg;
          return {
            where: vi.fn().mockResolvedValue([]),
          };
        }),
      } as any;
    });

    await request(app).post(URL).set("Authorization", "Bearer valid-token");

    expect(capturedSet).toBeDefined();
    expect(capturedSet.isPublic).toBe(false);
    expect(capturedSet.shareToken).toBeDefined();
    expect(capturedSet.shareToken).not.toBe("old-token-uuid");
  });

  it("works even if project has no existing share token", async () => {
    const noTokenProject = {
      ...fakeProject,
      shareToken: null as unknown as string,
      isPublic: false,
    };
    setupSelect(noTokenProject);
    setupUpdate();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Share link revoked");
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
