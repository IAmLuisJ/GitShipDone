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

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockUpdate = vi.mocked((db as any).update);

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

function setupInsertMock(returnRows: unknown[] = []) {
  const chain = {
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returnRows),
  };
  mockInsert.mockReturnValue(chain as any);
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

describe("GET /api/auth/google", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should respond (not 404) indicating the route is registered", async () => {
    // Without valid Google credentials, passport will fail but the route exists
    const res = await request(app).get("/api/auth/google");
    // Route exists — passport without credentials may return 500 or redirect, but NOT 404
    expect(res.status).not.toBe(404);
  });
});

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to frontend with error on auth failure", async () => {
    // Mock passport to simulate failure
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

    const res = await request(app).get("/api/auth/google/callback");
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

    const res = await request(app).get("/api/auth/google/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/login?error=oauth_failed");
  });

  it("should redirect to frontend callback with token on success", async () => {
    const fakeUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
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

    // Mock db.insert for storing refresh token
    setupInsertMock();

    const res = await request(app).get("/api/auth/google/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/auth/callback?token=");
  });

  it("should set HttpOnly refresh token cookie on success", async () => {
    const fakeUser = {
      id: "user-456",
      email: "oauth@example.com",
      name: "OAuth User",
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

    const res = await request(app).get("/api/auth/google/callback");
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
      id: "user-789",
      email: "store@example.com",
      name: "Store User",
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

    await request(app).get("/api/auth/google/callback");
    expect(mockInsert).toHaveBeenCalled();
    expect(insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-789",
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
    );
  });
});
