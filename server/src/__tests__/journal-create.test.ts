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

// Mock pointsService
vi.mock("../services/pointsService", () => ({
  awardPoints: vi.fn().mockResolvedValue({
    newTotal: 5,
    level: "Seed",
    didLevelUp: false,
  }),
}));

import { db } from "../db";
import { awardPoints } from "../services/pointsService";

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockAwardPoints = vi.mocked(awardPoints);

const fakeProject = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "My Project",
  description: null,
  type: "software",
  status: "active",
  progressAuto: 0,
  progressManual: null,
  pointsTotal: 0,
  level: "Seed",
  shareToken: null,
  isPublic: false,
  githubRepoId: null,
  githubRepoName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const fakeEntry = {
  id: "entry-uuid-1",
  projectId: "project-uuid-1",
  title: "Day 1 Progress",
  body: "Made great progress today.",
  mood: "excited",
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

function setupSelectMock(projectFound: boolean) {
  mockSelect.mockImplementation(() => {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue(projectFound ? [fakeProject] : []),
        }),
      }),
    } as any;
  });
}

let insertCallCount = 0;

function setupInsertMock(returnedEntry: any = fakeEntry) {
  insertCallCount = 0;
  mockInsert.mockImplementation(() => {
    insertCallCount++;
    if (insertCallCount === 1) {
      // journal entry insert
      return {
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returnedEntry]),
        }),
      } as any;
    }
    // timeline event insert
    return {
      values: vi.fn().mockResolvedValue([]),
    } as any;
  });
}

const URL = "/api/projects/project-uuid-1/journal";

describe("POST /api/projects/:id/journal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertCallCount = 0;
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(URL)
      .send({ title: "Test", body: "Content" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelectMock(false);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Test", body: "Content" });
    expect(res.status).toBe(404);
  });

  it("returns 400 if title is missing", async () => {
    setupSelectMock(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ body: "Content" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 if body is missing", async () => {
    setupSelectMock(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Test" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 if title is empty string", async () => {
    setupSelectMock(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "", body: "Content" });
    expect(res.status).toBe(400);
  });

  it("returns 400 if body is empty string", async () => {
    setupSelectMock(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Test", body: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid mood", async () => {
    setupSelectMock(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Test", body: "Content", mood: "angry" });
    expect(res.status).toBe(400);
  });

  it("returns 201 with created journal entry", async () => {
    setupSelectMock(true);
    setupInsertMock();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Day 1 Progress", body: "Made great progress today.", mood: "excited" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("entry-uuid-1");
    expect(res.body.title).toBe("Day 1 Progress");
    expect(res.body.mood).toBe("excited");
  });

  it("creates entry without mood (optional)", async () => {
    const entryNoMood = { ...fakeEntry, mood: null };
    setupSelectMock(true);
    setupInsertMock(entryNoMood);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Quick update", body: "No mood today" });

    expect(res.status).toBe(201);
    expect(res.body.mood).toBeNull();
  });

  it("awards +5 points with journal source", async () => {
    setupSelectMock(true);
    setupInsertMock();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Day 1 Progress", body: "Content" });

    expect(mockAwardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      5,
      "Journal entry: Day 1 Progress",
      "journal",
    );
  });

  it("inserts journal timeline event", async () => {
    setupSelectMock(true);
    setupInsertMock();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Day 1 Progress", body: "Content", mood: "excited" });

    // insert called twice: once for journal entry, once for timeline event
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});
