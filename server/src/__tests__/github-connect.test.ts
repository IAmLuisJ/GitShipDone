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
import { getOctokit, getRepo, importCommits } from "../services/githubService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockGetOctokit = vi.mocked(getOctokit);
const mockGetRepo = vi.mocked(getRepo);
const mockImportCommits = vi.mocked(importCommits);

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

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  passwordHash: "hashed",
  githubId: "gh-123",
  googleId: null,
  githubAccessToken: "encrypted-token",
  aiProvider: null,
  aiApiKey: null,
  emailNotificationsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeUserNoToken = {
  ...fakeUser,
  githubAccessToken: null,
};

const URL = "/api/projects/project-uuid-1/github/connect";

let selectCallCount = 0;

/**
 * Setup mocks for the select chain. First call returns project (or not),
 * second call returns user.
 */
function setupMocks(opts: {
  projectFound: boolean;
  user?: typeof fakeUser | typeof fakeUserNoToken;
}) {
  selectCallCount = 0;
  mockSelect.mockImplementation((..._args: any[]) => {
    selectCallCount++;
    const currentCall = selectCallCount;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            if (currentCall === 1) {
              return Promise.resolve(
                opts.projectFound ? [fakeProject] : [],
              );
            }
            // Second call — user lookup
            return Promise.resolve(opts.user ? [opts.user] : []);
          }),
        }),
      }),
    } as any;
  });
}

function setupUpdate() {
  mockUpdate.mockImplementation((..._args: any[]) => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...fakeProject, githubRepoName: "octocat/hello-world" }]),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/github/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
    mockGetOctokit.mockReturnValue({} as any);
    mockGetRepo.mockResolvedValue({ id: 12345 } as any);
    mockImportCommits.mockResolvedValue(undefined);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(URL)
      .send({ repoOwner: "octocat", repoName: "hello-world" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupMocks({ projectFound: false });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });
    expect(res.status).toBe(404);
  });

  it("returns 400 with missing repoOwner", async () => {
    setupMocks({ projectFound: true, user: fakeUser });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoName: "hello-world" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 with missing repoName", async () => {
    setupMocks({ projectFound: true, user: fakeUser });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 if user has no github_access_token", async () => {
    setupMocks({ projectFound: true, user: fakeUserNoToken });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("GitHub account not connected");
  });

  it("returns 400 if repo not found on GitHub", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    mockGetRepo.mockRejectedValue(new Error("Not Found"));

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "nonexistent" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Repo not found or no access");
  });

  it("returns 200 on successful connect", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    setupUpdate();
    mockGetRepo.mockResolvedValue({ id: 12345 } as any);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });

    expect(res.status).toBe(200);
    expect(res.body.repoName).toBe("octocat/hello-world");
    expect(res.body.importStatus).toBe("importing");
  });

  it("calls getOctokit with encrypted token", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });

    expect(mockGetOctokit).toHaveBeenCalledWith("encrypted-token");
  });

  it("calls getRepo with correct owner and repo", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });

    expect(mockGetRepo).toHaveBeenCalledWith(
      expect.anything(),
      "octocat",
      "hello-world",
    );
  });

  it("updates project with repo info", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("fires importCommits in background", async () => {
    setupMocks({ projectFound: true, user: fakeUser });
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ repoOwner: "octocat", repoName: "hello-world" });

    expect(mockImportCommits).toHaveBeenCalledWith(
      "project-uuid-1",
      expect.anything(),
      "octocat",
      "hello-world",
    );
  });
});
