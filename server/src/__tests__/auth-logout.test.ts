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
  signAccessToken: vi.fn().mockReturnValue("access-token"),
  signRefreshToken: vi.fn().mockReturnValue("refresh-token"),
  verifyRefreshToken: vi.fn(),
}));

import { db } from "../db";
import { verifyRefreshToken } from "../utils/jwt";

const mockSelect = vi.mocked(db.select);
const mockDelete = vi.mocked((db as any).delete);
const mockVerifyRefresh = vi.mocked(verifyRefreshToken);

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/auth/logout", () => {
  it("returns 200 when no cookie is present (idempotent)", async () => {
    const res = await request(app).post("/api/auth/logout").send();
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });

  it("clears the refreshToken cookie", async () => {
    const res = await request(app).post("/api/auth/logout").send();

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith("refreshToken="))
      : cookies;
    expect(refreshCookie).toBeDefined();
    // Cookie should be cleared (empty value or expires in the past)
    expect(refreshCookie).toMatch(/refreshToken=/);
  });

  it("returns 200 when cookie has invalid JWT", async () => {
    mockVerifyRefresh.mockImplementation(() => {
      throw new Error("invalid token");
    });

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "refreshToken=bad-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });

  it("deletes matching token from database on valid cookie", async () => {
    const rawToken = "valid-refresh-token";
    const tokenHash = await bcrypt.hash(rawToken, 4);

    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupTokenSelectMock([
      {
        id: "tok-1",
        userId: "user-id",
        tokenHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);
    setupDeleteMock();

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", `refreshToken=${rawToken}`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
    expect(mockDelete).toHaveBeenCalled();
  });

  it("returns 200 when token is valid but not found in DB", async () => {
    const nonMatchingHash = await bcrypt.hash("different-token", 4);

    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupTokenSelectMock([
      {
        id: "tok-1",
        userId: "user-id",
        tokenHash: nonMatchingHash,
        expiresAt: new Date(Date.now() + 86400000),
      },
    ]);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "refreshToken=valid-refresh-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });

  it("returns 200 when user has no stored tokens", async () => {
    mockVerifyRefresh.mockReturnValue({ sub: "user-id" });
    setupTokenSelectMock([]);

    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "refreshToken=valid-refresh-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Logged out");
  });
});
