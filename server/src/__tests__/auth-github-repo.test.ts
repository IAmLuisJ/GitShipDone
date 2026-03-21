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

// Mock the encryption module
vi.mock("../utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

import { db } from "../db";
import app from "../app";

describe("GET /api/auth/github/repo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should return 401 without auth token", async () => {
    const res = await request(app).get("/api/auth/github/repo");
    expect(res.status).toBe(401);
  });

  it("should respond (not 404) indicating the route is registered", async () => {
    const res = await request(app).get("/api/auth/github/repo");
    expect(res.status).not.toBe(404);
  });
});

describe("GET /api/auth/github/repo/callback", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should redirect to settings with error on auth failure", async () => {
    vi.spyOn(passport, "authenticate").mockImplementation(
      (strategy: string | string[], _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (strategy === "github-repo" && callback) {
            callback(new Error("OAuth failed"), false);
          } else if (callback) {
            callback(null, false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/repo/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/settings?github=error");
  });

  it("should redirect to settings with error when user is false", async () => {
    vi.spyOn(passport, "authenticate").mockImplementation(
      (strategy: string | string[], _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (strategy === "github-repo" && callback) {
            callback(null, false);
          } else if (callback) {
            callback(null, false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/repo/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/settings?github=error");
  });

  it("should redirect to settings with connected on success", async () => {
    const fakeUser = {
      id: "user-repo-123",
      githubAccessToken: "encrypted:ghp_faketoken",
    };

    vi.spyOn(passport, "authenticate").mockImplementation(
      (strategy: string | string[], _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (strategy === "github-repo" && callback) {
            callback(null, fakeUser);
          } else if (callback) {
            callback(null, false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/repo/callback");
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("/settings?github=connected");
  });

  it("should not set refresh token cookie on repo callback", async () => {
    const fakeUser = {
      id: "user-repo-456",
      githubAccessToken: "encrypted:ghp_faketoken",
    };

    vi.spyOn(passport, "authenticate").mockImplementation(
      (strategy: string | string[], _opts: any, callback?: any) => {
        return (req: any, res: any, next: any) => {
          if (strategy === "github-repo" && callback) {
            callback(null, fakeUser);
          } else if (callback) {
            callback(null, false);
          } else {
            next();
          }
        };
      },
    );

    const res = await request(app).get("/api/auth/github/repo/callback");
    const cookies = res.headers["set-cookie"];
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.includes("refreshToken"))
      : undefined;
    expect(refreshCookie).toBeUndefined();
  });
});
