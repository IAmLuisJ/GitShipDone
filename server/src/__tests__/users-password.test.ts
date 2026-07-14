 
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

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(() => "$2b$12$newhashedpassword"),
  },
}));

import { db } from "../db";
import bcrypt from "bcryptjs";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockDelete = vi.mocked(db.delete);
const mockCompare = vi.mocked(bcrypt.compare);
const mockHash = vi.mocked(bcrypt.hash);

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  passwordHash: "$2b$10$secrethash",
  githubId: null,
  googleId: null,
  githubAccessToken: null,
  aiProvider: "openai",
  aiApiKey: null,
  emailNotificationsEnabled: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

describe("PATCH /api/users/me/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch("/api/users/me/password")
      .send({ currentPassword: "old", newPassword: "newpass123" });
    expect(res.status).toBe(401);
  });

  it("returns 400 if newPassword is less than 8 characters", async () => {
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ currentPassword: "oldpass", newPassword: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if currentPassword is missing", async () => {
    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ newPassword: "newpass123" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for OAuth-only account (no passwordHash)", async () => {
    const oauthUser = { ...fakeUser, passwordHash: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([oauthUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ currentPassword: "oldpass", newPassword: "newpass123" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Password login not available for OAuth accounts",
    );
  });

  it("returns 401 if current password is incorrect", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);
    mockCompare.mockResolvedValue(false as never);

    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ currentPassword: "wrongpass", newPassword: "newpass123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Current password is incorrect");
  });

  it("returns 200 on success and invalidates refresh tokens", async () => {
    // Mock select user
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    // bcrypt compare returns true
    mockCompare.mockResolvedValue(true as never);
    mockHash.mockResolvedValue("$2b$12$newhashedpassword" as never);

    // Mock update user
    const updateSet = vi.fn().mockReturnThis();
    const updateWhere = vi.fn().mockResolvedValue([]);
    mockUpdate.mockReturnValue({
      set: updateSet,
      where: updateWhere,
    } as any);

    // Mock delete refresh tokens
    const deleteWhere = vi.fn().mockResolvedValue([]);
    mockDelete.mockReturnValue({ where: deleteWhere } as any);

    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ currentPassword: "oldpass123", newPassword: "newpass123" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password changed successfully");

    // Verify bcrypt was called correctly
    expect(mockCompare).toHaveBeenCalledWith(
      "oldpass123",
      fakeUser.passwordHash,
    );
    expect(mockHash).toHaveBeenCalledWith("newpass123", 12);

    // Verify update and delete were called
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 404 if user not found (soft-deleted)", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockResolvedValue([]);
    mockSelect.mockReturnValue({ from: mockFrom, where: mockWhere } as any);

    const res = await request(app)
      .patch("/api/users/me/password")
      .set("Authorization", "Bearer valid-token")
      .send({ currentPassword: "oldpass", newPassword: "newpass123" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });
});
