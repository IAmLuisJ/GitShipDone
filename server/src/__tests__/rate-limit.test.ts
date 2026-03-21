import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

describe("Rate limiting on auth endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Return no user found — we just need the endpoint to respond, not succeed auth
    setupSelectMock([]);
  });

  it("login returns 429 after 5 requests in 15 minutes", async () => {
    const agent = request(app);

    // Send 5 requests — all should return non-429
    for (let i = 0; i < 5; i++) {
      const res = await agent
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "wrong" });
      expect(res.status).not.toBe(429);
    }

    // 6th request should be rate limited
    const res = await agent
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "wrong" });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many login attempts/i);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("register returns 429 after 10 requests in 1 hour", async () => {
    const agent = request(app);

    for (let i = 0; i < 10; i++) {
      const res = await agent.post("/api/auth/register").send({
        email: `user${i}@test.com`,
        name: "Test",
        password: "password123",
      });
      expect(res.status).not.toBe(429);
    }

    // 11th request should be rate limited
    const res = await agent.post("/api/auth/register").send({
      email: "extra@test.com",
      name: "Test",
      password: "password123",
    });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many registration attempts/i);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("forgot-password returns 429 after 3 requests in 1 hour", async () => {
    const agent = request(app);

    for (let i = 0; i < 3; i++) {
      const res = await agent
        .post("/api/auth/forgot-password")
        .send({ email: `user${i}@test.com` });
      expect(res.status).not.toBe(429);
    }

    // 4th request should be rate limited
    const res = await agent
      .post("/api/auth/forgot-password")
      .send({ email: "extra@test.com" });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many password reset/i);
    expect(res.headers["retry-after"]).toBeDefined();
  });

  it("rate limit response includes standard headers", async () => {
    const agent = request(app);

    // Exhaust login limit
    for (let i = 0; i < 5; i++) {
      await agent
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "wrong" });
    }

    const res = await agent
      .post("/api/auth/login")
      .send({ email: "test@test.com", password: "wrong" });

    expect(res.status).toBe(429);
    // standardHeaders: true adds RateLimit-* headers
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBe("0");
  });

  it("non-rate-limited auth endpoints are unaffected", async () => {
    const agent = request(app);

    // Exhaust login limit
    for (let i = 0; i < 6; i++) {
      await agent
        .post("/api/auth/login")
        .send({ email: "test@test.com", password: "wrong" });
    }

    // Other auth endpoints should still work
    const refreshRes = await agent.post("/api/auth/refresh");
    expect(refreshRes.status).not.toBe(429);

    const logoutRes = await agent.post("/api/auth/logout");
    expect(logoutRes.status).not.toBe(429);
  });
});
