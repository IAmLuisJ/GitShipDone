 
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

const now = new Date();
const fakeNotifications = [
  {
    id: "notif-1",
    userId: "user-uuid-123",
    projectId: "project-1",
    type: "milestone_due",
    message: "Milestone due tomorrow",
    isRead: false,
    snoozedUntil: null,
    createdAt: new Date(now.getTime() - 1000),
  },
  {
    id: "notif-2",
    userId: "user-uuid-123",
    projectId: "project-1",
    type: "todo_due",
    message: "Todo due",
    isRead: false,
    snoozedUntil: null,
    createdAt: new Date(now.getTime() - 2000),
  },
  {
    id: "notif-3",
    userId: "user-uuid-123",
    projectId: null,
    type: "system",
    message: "Welcome!",
    isRead: true,
    snoozedUntil: null,
    createdAt: new Date(now.getTime() - 3000),
  },
];

const URL = "/api/notifications";

/**
 * Sets up the mock select chain.
 * First call returns the notification rows, second call returns unread count.
 */
function setupSelect(rows: any[], unreadCount: number) {
  let callIndex = 0;
  mockSelect.mockImplementation(() => {
    const idx = callIndex++;
    if (idx === 0) {
      // Notification list query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(rows),
            }),
          }),
        }),
      } as any;
    }
    // Unread count query
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ value: unreadCount }]),
      }),
    } as any;
  });
}

describe("GET /api/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it("returns all non-snoozed notifications with unread count", async () => {
    setupSelect(fakeNotifications, 2);

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(3);
    expect(res.body.unreadCount).toBe(2);
  });

  it("returns notifications ordered by created_at DESC", async () => {
    setupSelect(fakeNotifications, 2);

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    const dates = res.body.notifications.map(
      (n: any) => new Date(n.createdAt).getTime(),
    );
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }
  });

  it("filters unread only when unreadOnly=true", async () => {
    const unreadOnly = fakeNotifications.filter((n) => !n.isRead);
    setupSelect(unreadOnly, 2);

    const res = await request(app)
      .get(`${URL}?unreadOnly=true`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(2);
    res.body.notifications.forEach((n: any) => {
      expect(n.isRead).toBe(false);
    });
  });

  it("returns empty list when no notifications exist", async () => {
    setupSelect([], 0);

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(0);
    expect(res.body.unreadCount).toBe(0);
  });

  it("calls db.select twice (list + unread count)", async () => {
    setupSelect(fakeNotifications, 2);

    await request(app).get(URL).set("Authorization", "Bearer valid-token");

    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
