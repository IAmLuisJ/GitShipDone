import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock jwt utils so we can control token verification
vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn().mockReturnValue("new-access-token"),
  signRefreshToken: vi.fn().mockReturnValue("new-refresh-token"),
  verifyRefreshToken: vi.fn(),
}));

import { db } from "../db";
import { verifyRefreshToken } from "../utils/jwt";

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockDelete = vi.mocked((db as any).delete);
const mockVerifyRefresh = vi.mocked(verifyRefreshToken);

function setupUserSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValueOnce(chain as any);
  return chain;
}

function setupTokenSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValueOnce(chain as any);
  return chain;
}

function setupDeleteMock() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockDelete.mockReturnValueOnce(chain as any);
  return chain;
}

function setupInsertMock() {
  const chain = {
    values: vi.fn().mockResolvedValue(undefined),
  };
  mockInsert.mockReturnValueOnce(chain as any);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/refresh", () => {
  it("returns 401 when no refresh token cookie is present", async () => {
    const res = await request(app).post("/api/auth/refresh").send();
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Missing refresh token");
  });

  it("returns 401 when JWT verification fails", async () => {
    mockVerifyRefresh.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=bad-token")
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
  });

  it("returns 401 when user not found", async () => {
    mockVerifyRefresh.mockReturnValue({ sub: "missing-user-id" });
    setupUserSelectMock([]);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=valid-token")
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
  });

  it("returns 401 when user is soft-deleted", async () => {
    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupUserSelectMock([{ id: "user-id", deletedAt: new Date() }]);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=valid-token")
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
  });

  it("returns 401 when no matching token hash found", async () => {
    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupUserSelectMock([{ id: "user-id", deletedAt: null }]);
    // Return tokens that won't match
    const nonMatchingHash = await bcrypt.hash("different-token", 4);
    setupTokenSelectMock([
      {
        id: "tok-1",
        userId: "user-id",
        tokenHash: nonMatchingHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=valid-token")
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
  });

  it("returns 401 when no stored tokens exist", async () => {
    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupUserSelectMock([{ id: "user-id", deletedAt: null }]);
    setupTokenSelectMock([]);

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=valid-token")
      .send();

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid refresh token");
  });

  it("returns 200 with new accessToken on success and rotates token", async () => {
    const rawToken = "valid-refresh-token";
    const tokenHash = await bcrypt.hash(rawToken, 4);

    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupUserSelectMock([{ id: "user-id", deletedAt: null }]);
    setupTokenSelectMock([
      {
        id: "tok-1",
        userId: "user-id",
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);
    setupDeleteMock(); // delete old token
    setupInsertMock(); // insert new token

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe("new-access-token");

    // Verify old token was deleted
    expect(mockDelete).toHaveBeenCalled();

    // Verify new token was stored
    expect(mockInsert).toHaveBeenCalled();
  });

  it("sets new HttpOnly refresh token cookie on success", async () => {
    const rawToken = "valid-refresh-token";
    const tokenHash = await bcrypt.hash(rawToken, 4);

    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupUserSelectMock([{ id: "user-id", deletedAt: null }]);
    setupTokenSelectMock([
      {
        id: "tok-1",
        userId: "user-id",
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);
    setupDeleteMock();
    setupInsertMock();

    const res = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${rawToken}`)
      .send();

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("refreshToken="))
      : cookies;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/httponly/i);
    expect(refreshCookie).toMatch(/samesite=lax/i);
    // The new cookie should contain 'new-refresh-token' (from mocked signRefreshToken)
    expect(refreshCookie).toContain("new-refresh-token");
  });
});
