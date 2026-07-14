 
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
    transaction: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

const AUTH = { Authorization: "Bearer valid-token" };

const fakeNotification = {
  id: "notif-1",
  userId: "user-uuid-123",
  projectId: "project-1",
  type: "milestone_due",
  message: "Milestone due tomorrow",
  isRead: false,
  snoozedUntil: null,
  createdAt: new Date(),
};

describe("PATCH /api/notifications/:nid/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch("/api/notifications/notif-1/read");
    expect(res.status).toBe(401);
  });

  it("returns 404 if notification does not belong to user", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const res = await request(app)
      .patch("/api/notifications/notif-999/read")
      .set(AUTH);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Notification not found");
  });

  it("marks notification as read and returns 200", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeNotification]),
        }),
      }),
    } as any);

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    } as any);

    const res = await request(app)
      .patch("/api/notifications/notif-1/read")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Notification marked as read");
  });

  it("calls db.update to set isRead = true", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeNotification]),
        }),
      }),
    } as any);

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    } as any);

    await request(app).patch("/api/notifications/notif-1/read").set(AUTH);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post("/api/notifications/read-all");
    expect(res.status).toBe(401);
  });

  it("marks all notifications as read and returns updated count", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 3 }),
      }),
    } as any);

    const res = await request(app)
      .post("/api/notifications/read-all")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(3);
  });

  it("returns 0 updated when no unread notifications", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 0 }),
      }),
    } as any);

    const res = await request(app)
      .post("/api/notifications/read-all")
      .set(AUTH);

    expect(res.status).toBe(200);
    expect(res.body.updated).toBe(0);
  });

  it("calls db.update once for read-all", async () => {
    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 2 }),
      }),
    } as any);

    await request(app).post("/api/notifications/read-all").set(AUTH);

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
