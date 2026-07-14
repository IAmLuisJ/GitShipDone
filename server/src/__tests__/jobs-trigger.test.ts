import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";

// Mock the DB module so importing app doesn't need a live database
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}));

const mockRunReminderCheck = vi.fn();
vi.mock("../jobs/reminders", () => ({
  runReminderCheck: () => mockRunReminderCheck(),
  startReminderJob: vi.fn(),
}));

import app from "../app";

describe("POST /api/jobs/reminders/run", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockRunReminderCheck.mockReset();
  });

  it("404s when CRON_SECRET is not configured", async () => {
    const res = await request(app).post("/api/jobs/reminders/run");

    expect(res.status).toBe(404);
    expect(mockRunReminderCheck).not.toHaveBeenCalled();
  });

  it("401s with a wrong or missing bearer token", async () => {
    vi.stubEnv("CRON_SECRET", "topsecret");

    const missing = await request(app).post("/api/jobs/reminders/run");
    expect(missing.status).toBe(401);

    const wrong = await request(app)
      .post("/api/jobs/reminders/run")
      .set("Authorization", "Bearer nope");
    expect(wrong.status).toBe(401);

    expect(mockRunReminderCheck).not.toHaveBeenCalled();
  });

  it("runs the reminder check and returns its result with the right secret", async () => {
    vi.stubEnv("CRON_SECRET", "topsecret");
    mockRunReminderCheck.mockResolvedValue({
      skipped: false,
      milestoneReminders: 2,
      todoReminders: 1,
    });

    const res = await request(app)
      .post("/api/jobs/reminders/run")
      .set("Authorization", "Bearer topsecret");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      skipped: false,
      milestoneReminders: 2,
      todoReminders: 1,
    });
    expect(mockRunReminderCheck).toHaveBeenCalledTimes(1);
  });

  it("404s when FEATURE_REMINDERS is off, even with a valid secret", async () => {
    vi.stubEnv("FEATURE_REMINDERS", "false");
    vi.stubEnv("CRON_SECRET", "topsecret");

    const res = await request(app)
      .post("/api/jobs/reminders/run")
      .set("Authorization", "Bearer topsecret");

    expect(res.status).toBe(404);
    expect(mockRunReminderCheck).not.toHaveBeenCalled();
  });
});
