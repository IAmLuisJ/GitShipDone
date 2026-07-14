 
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
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

// Mock bcrypt
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { db } from "../db";
import bcrypt from "bcryptjs";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockDelete = vi.mocked(db.delete);
const mockCompare = vi.mocked(bcrypt.compare);

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  passwordHash: "$2b$10$secrethash",
  githubId: null,
  googleId: null,
  githubAccessToken: null,
  aiProvider: null,
  aiApiKey: null,
  emailNotificationsEnabled: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

describe("DELETE /api/users/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .send({ confirmPassword: "password123" });
    expect(res.status).toBe(401);
  });

  it("returns 400 if confirmPassword is missing", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 404 if user not found (soft-deleted)", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ confirmPassword: "password123" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("returns 400 for OAuth-only accounts (no passwordHash)", async () => {
    const oauthUser = { ...fakeUser, passwordHash: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([oauthUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ confirmPassword: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Password verification not available for OAuth accounts",
    );
  });

  it("returns 401 if password is incorrect", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);
    mockCompare.mockResolvedValue(false as any);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ confirmPassword: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Password is incorrect");
  });

  it("soft deletes account and invalidates all tokens on success", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockSelectWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockSelectWhere,
    } as any);

    mockCompare.mockResolvedValue(true as any);

    const mockUpdateSet = vi.fn().mockReturnThis();
    const mockUpdateWhere = vi.fn().mockResolvedValue([]);
    mockUpdate.mockReturnValue({
      set: mockUpdateSet,
      where: mockUpdateWhere,
    } as any);

    const mockDeleteWhere = vi.fn().mockResolvedValue([]);
    mockDelete.mockReturnValue({ where: mockDeleteWhere } as any);

    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ confirmPassword: "correctpassword" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Account deleted");

    // Verify soft delete was called
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      }),
    );

    // Verify refresh tokens were deleted
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 400 if confirmPassword is empty string", async () => {
    const res = await request(app)
      .delete("/api/users/me")
      .set("Authorization", "Bearer valid-token")
      .send({ confirmPassword: "" });
    expect(res.status).toBe(400);
  });
});
