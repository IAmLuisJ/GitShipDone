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
  listRepos: vi.fn(),
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
import { getOctokit, listRepos } from "../services/githubService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockGetOctokit = vi.mocked(getOctokit);
const mockListRepos = vi.mocked(listRepos);

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  passwordHash: "$2b$10$secrethash",
  githubId: null,
  googleId: null,
  githubAccessToken: "ghp_encrypted_token",
  aiProvider: "openai",
  aiApiKey: "encrypted-api-key",
  emailNotificationsEnabled: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

describe("GET /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/users/me");
    expect(res.status).toBe(401);
  });

  it("returns 404 if user not found (soft-deleted or missing)", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("returns sanitized user profile with correct fields", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "user-uuid-123",
      email: "test@example.com",
      name: "Test User",
      avatarUrl: "https://example.com/avatar.png",
      aiProvider: "openai",
      hasAiKey: true,
      emailNotificationsEnabled: true,
      githubConnected: true,
      createdAt: fakeUser.createdAt.toISOString(),
    });
  });

  it("does NOT return password_hash or sensitive tokens", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("password_hash");
    expect(res.body).not.toHaveProperty("aiApiKey");
    expect(res.body).not.toHaveProperty("ai_api_key");
    expect(res.body).not.toHaveProperty("githubAccessToken");
    expect(res.body).not.toHaveProperty("github_access_token");
  });

  it("returns hasAiKey=false when user has no AI key", async () => {
    const userNoKey = { ...fakeUser, aiApiKey: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([userNoKey]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.hasAiKey).toBe(false);
  });

  it("returns githubConnected=false when no GitHub token", async () => {
    const userNoGithub = { ...fakeUser, githubAccessToken: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([userNoGithub]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.githubConnected).toBe(false);
  });
});

describe("GET /api/users/me/github/repos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOctokit.mockReturnValue({} as any);
    mockListRepos.mockResolvedValue([
      {
        id: 123,
        fullName: "octocat/hello-world",
        htmlUrl: "https://github.com/octocat/hello-world",
        name: "hello-world",
        owner: "octocat",
        private: false,
      },
    ]);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/users/me/github/repos");
    expect(res.status).toBe(401);
  });

  it("returns 400 when GitHub is not connected", async () => {
    const userNoGithub = { ...fakeUser, githubAccessToken: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([userNoGithub]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me/github/repos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("GitHub account not connected");
  });

  it("returns sanitized repositories for a connected GitHub account", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me/github/repos")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: 123,
        fullName: "octocat/hello-world",
        htmlUrl: "https://github.com/octocat/hello-world",
        name: "hello-world",
        owner: "octocat",
        private: false,
      },
    ]);
    expect(mockGetOctokit).toHaveBeenCalledWith("ghp_encrypted_token");
  });
});

describe("PATCH /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch("/api/users/me").send({ name: "New" });
    expect(res.status).toBe(401);
  });

  it("updates name and returns sanitized profile", async () => {
    const updatedUser = { ...fakeUser, name: "Updated Name" };
    const mockSet = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockReturning = vi.fn().mockResolvedValue([updatedUser]);
    mockUpdate.mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    } as any);

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Updated Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body).not.toHaveProperty("passwordHash");
    expect(res.body).not.toHaveProperty("aiApiKey");
  });

  it("updates avatarUrl and returns sanitized profile", async () => {
    const updatedUser = {
      ...fakeUser,
      avatarUrl: "https://example.com/new-avatar.png",
    };
    const mockSet = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockReturning = vi.fn().mockResolvedValue([updatedUser]);
    mockUpdate.mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    } as any);

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ avatarUrl: "https://example.com/new-avatar.png" });

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe("https://example.com/new-avatar.png");
  });

  it("returns 400 if email is included in body", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ email: "new@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Email changes not supported");
  });

  it("returns 400 if no valid fields provided", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid avatarUrl", async () => {
    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ avatarUrl: "not-a-url" });

    expect(res.status).toBe(400);
  });

  it("returns 404 if user not found (soft-deleted)", async () => {
    const mockSet = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockReturning = vi.fn().mockResolvedValue([]);
    mockUpdate.mockReturnValue({
      set: mockSet,
      where: mockWhere,
      returning: mockReturning,
    } as any);

    const res = await request(app)
      .patch("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});
