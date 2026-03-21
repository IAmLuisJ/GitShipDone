import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import passport from "passport";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from "../db";
import app from "../app";

const mockInsert = vi.mocked(db.insert);

function setupInsertMock(returnRows: unknown[] = []) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  };
  mockInsert.mockReturnValue(chain as any);
  return chain;
}

describe("GET /api/auth/github", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should respond (not 404) indicating the route is registered", async () => {
    const res = await request(app).get("/api/auth/github");
    expect(res.status).not.toBe(404);
  });
});

describe("GET /api/auth/github/callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to frontend with error on auth failure", async () => {
    vi.spyOn(passport, "authenticate").mockImplementation(
      (_strategy: string, _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (callback) {
            callback(new Error("OAuth failed"), false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=oauth_failed");
  });

  it("should redirect to frontend with error when user is false", async () => {
    vi.spyOn(passport, "authenticate").mockImplementation(
      (_strategy: string, _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (callback) {
            callback(null, false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=oauth_failed");
  });

  it("should redirect to frontend callback with token on success", async () => {
    const fakeUser = {
      id: "user-gh-123",
      email: "github@example.com",
      name: "GitHub User",
    };

    vi.spyOn(passport, "authenticate").mockImplementation(
      (_strategy: string, _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (callback) {
            callback(null, fakeUser);
          } else {
            next();
          }
        };
      },
    );

    setupInsertMock();

    const res = await request(app).get("/api/auth/github/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/auth/callback?token=");
  });

  it("should set HttpOnly refresh token cookie on success", async () => {
    const fakeUser = {
      id: "user-gh-456",
      email: "ghcookie@example.com",
      name: "GH Cookie User",
    };

    vi.spyOn(passport, "authenticate").mockImplementation(
      (_strategy: string, _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (callback) {
            callback(null, fakeUser);
          } else {
            next();
          }
        };
      },
    );

    setupInsertMock();

    const res = await request(app).get("/api/auth/github/callback");
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.includes("refreshToken"))
      : cookies?.includes("refreshToken")
        ? cookies
        : undefined;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
  });

  it("should store hashed refresh token in database on success", async () => {
    const fakeUser = {
      id: "user-gh-789",
      email: "ghstore@example.com",
      name: "GH Store User",
    };

    vi.spyOn(passport, "authenticate").mockImplementation(
      (_strategy: string, _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (callback) {
            callback(null, fakeUser);
          } else {
            next();
          }
        };
      },
    );

    const insertChain = setupInsertMock();

    await request(app).get("/api/auth/github/callback");
    expect(mockInsert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-gh-789",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
  });
});
