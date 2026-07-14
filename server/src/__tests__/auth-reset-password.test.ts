import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock the email service
vi.mock("../services/email", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked((db as any).update);
const mockDelete = vi.mocked(db.delete);

// Helper: create a hashed token for test matching
async function makeTokenHash(rawToken: string) {
  return bcrypt.hash(rawToken, 10);
}

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

function setupUpdateMock() {
  const chain = {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockUpdate.mockReturnValue(chain as any);
  return chain;
}

function setupDeleteMock() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockDelete.mockReturnValue(chain as any);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/reset-password", () => {
  const validToken = "a".repeat(64);
  const newPassword = "newSecurePassword123";

  it("returns 200 and updates password for valid token", async () => {
    const tokenHash = await makeTokenHash(validToken);
    setupSelectMock([
      {
        id: "token-id-1",
        userId: "user-id-123",
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      },
    ]);
    setupUpdateMock();
    setupDeleteMock();

    const res = await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Password updated successfully");
    // Should have called update twice (password + mark token used)
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("returns 400 for invalid token (no match)", async () => {
    // Token hash that won't match
    const tokenHash = await makeTokenHash("different-token");
    setupSelectMock([
      {
        id: "token-id-1",
        userId: "user-id-123",
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      },
    ]);

    const res = await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("returns 400 when no unused tokens exist", async () => {
    setupSelectMock([]);

    const res = await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword,
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid or expired token");
  });

  it("returns 400 if newPassword is less than 8 characters", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword: "short",
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 if token is missing", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      newPassword,
    });

    expect(res.status).toBe(400);
  });

  it("returns 400 if newPassword is missing", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      token: validToken,
    });

    expect(res.status).toBe(400);
  });

  it("invalidates all refresh tokens for the user on success", async () => {
    const tokenHash = await makeTokenHash(validToken);
    setupSelectMock([
      {
        id: "token-id-1",
        userId: "user-id-123",
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      },
    ]);
    setupUpdateMock();
    setupDeleteMock();

    await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword,
    });

    // Should delete refresh tokens
    expect(mockDelete).toHaveBeenCalled();
  });

  it("marks the reset token as used", async () => {
    const tokenHash = await makeTokenHash(validToken);
    setupSelectMock([
      {
        id: "token-id-1",
        userId: "user-id-123",
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: null,
      },
    ]);
    const updateChain = setupUpdateMock();
    setupDeleteMock();

    await request(app).post("/api/auth/reset-password").send({
      token: validToken,
      newPassword,
    });

    // Second update call should be marking token as used (set usedAt)
    expect(updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        usedAt: expect.any(Date),
      }),
    );
  });

  it("returns 400 for empty body", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({});

    expect(res.status).toBe(400);
  });
});
