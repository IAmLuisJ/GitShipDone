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

// Mock encryption
vi.mock("../utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
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
import { encrypt } from "../utils/encryption";

const mockUpdate = vi.mocked(db.update);
const mockSelect = vi.mocked(db.select);

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  passwordHash: "$2b$10$secrethash",
  githubId: null,
  googleId: null,
  githubAccessToken: null,
  aiProvider: "openai",
  aiApiKey: "encrypted:sk-1234567890abcdef",
  emailNotificationsEnabled: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

describe("PATCH /api/users/me/ai-settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch("/api/users/me/ai-settings")
      .send({ provider: "openai", apiKey: "sk-1234567890abcdef" });

    expect(res.status).toBe(401);
  });

  it("returns 400 if provider is invalid", async () => {
    const res = await request(app)
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "gemini", apiKey: "sk-1234567890abcdef" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if apiKey is too short", async () => {
    const res = await request(app)
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "openai", apiKey: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if provider is missing", async () => {
    const res = await request(app)
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ apiKey: "sk-1234567890abcdef" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if apiKey is missing", async () => {
    const res = await request(app)
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "openai" });

    expect(res.status).toBe(400);
  });

  it("saves openai provider and encrypted key, returns 200", async () => {
    const updatedUser = {
      ...fakeUser,
      aiProvider: "openai",
      aiApiKey: "encrypted:sk-1234567890abcdef",
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
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "openai", apiKey: "sk-1234567890abcdef" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "AI settings saved",
      provider: "openai",
    });
    expect(encrypt).toHaveBeenCalledWith("sk-1234567890abcdef");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiProvider: "openai",
        aiApiKey: "encrypted:sk-1234567890abcdef",
      }),
    );
  });

  it("saves anthropic provider and encrypted key, returns 200", async () => {
    const updatedUser = {
      ...fakeUser,
      aiProvider: "anthropic",
      aiApiKey: "encrypted:sk-ant-1234567890",
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
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "anthropic", apiKey: "sk-ant-1234567890" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "AI settings saved",
      provider: "anthropic",
    });
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
      .patch("/api/users/me/ai-settings")
      .set("Authorization", "Bearer valid-token")
      .send({ provider: "openai", apiKey: "sk-1234567890abcdef" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("GET /me returns hasAiKey=true after saving AI settings", async () => {
    const userWithKey = { ...fakeUser, aiApiKey: "encrypted:sk-test" };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([userWithKey]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .get("/api/users/me")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.hasAiKey).toBe(true);
    expect(res.body.aiProvider).toBe("openai");
    expect(res.body).not.toHaveProperty("aiApiKey");
  });
});
