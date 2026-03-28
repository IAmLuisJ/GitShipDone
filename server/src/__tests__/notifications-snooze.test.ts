/* eslint-disable @typescript-eslint/no-explicit-any */
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

describe("PATCH /api/notifications/:nid/snooze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .send({ snoozeUntil: new Date(Date.now() + 3600000).toISOString() });
    expect(res.status).toBe(401);
  });

  it("returns 400 when snoozeUntil is missing", async () => {
    const res = await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .set(AUTH)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("snoozeUntil is required");
  });

  it("returns 400 when snoozeUntil is in the past", async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const res = await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .set(AUTH)
      .send({ snoozeUntil: pastDate });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("snoozeUntil must be in the future");
  });

  it("returns 404 if notification does not belong to user", async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as any);

    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const res = await request(app)
      .patch("/api/notifications/notif-999/snooze")
      .set(AUTH)
      .send({ snoozeUntil: futureDate });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Notification not found");
  });

  it("snoozes notification and returns 200 with updated notification", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const updatedNotification = {
      ...fakeNotification,
      snoozedUntil: new Date(futureDate),
    };

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeNotification]),
        }),
      }),
    } as any);

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([updatedNotification]),
        }),
      }),
    } as any);

    const res = await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .set(AUTH)
      .send({ snoozeUntil: futureDate });

    expect(res.status).toBe(200);
    expect(res.body.notification).toBeDefined();
    expect(res.body.notification.id).toBe("notif-1");
  });

  it("calls db.update to set snoozedUntil", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();

    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeNotification]),
        }),
      }),
    } as any);

    mockUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...fakeNotification, snoozedUntil: new Date(futureDate) }]),
        }),
      }),
    } as any);

    await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .set(AUTH)
      .send({ snoozeUntil: futureDate });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for invalid datetime string", async () => {
    const res = await request(app)
      .patch("/api/notifications/notif-1/snooze")
      .set(AUTH)
      .send({ snoozeUntil: "not-a-date" });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("valid ISO datetime");
  });
});
