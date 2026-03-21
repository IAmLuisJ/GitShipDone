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

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);

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

let selectCallCount = 0;

function setupSelectMock(projectFound: boolean, entryFound: boolean) {
  selectCallCount = 0;
  mockSelect.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
      // project lookup
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue(projectFound ? [fakeProject] : []),
          }),
        }),
      } as any;
    }
    // journal entry lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue(entryFound ? [fakeEntry] : []),
        }),
      }),
    } as any;
  });
}

function setupUpdateMock(returnedEntry: any = fakeEntry) {
  mockUpdate.mockImplementation(() => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returnedEntry]),
        }),
      }),
    } as any;
  });
}

const URL = "/api/projects/project-uuid-1/journal/entry-uuid-1";

describe("PATCH /api/projects/:id/journal/:jid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .patch(URL)
      .send({ title: "Updated" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelectMock(false, false);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 404 if journal entry not found", async () => {
    setupSelectMock(true, false);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Journal entry not found");
  });

  it("returns 400 if no fields provided", async () => {
    setupSelectMock(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 for empty title", async () => {
    setupSelectMock(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty body", async () => {
    setupSelectMock(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ body: "" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid mood", async () => {
    setupSelectMock(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ mood: "angry" });
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated entry when title changed", async () => {
    const updatedEntry = { ...fakeEntry, title: "Updated Title", updatedAt: new Date() };
    setupSelectMock(true, true);
    setupUpdateMock(updatedEntry);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated Title" });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Updated Title");
  });

  it("returns 200 when updating mood only", async () => {
    const updatedEntry = { ...fakeEntry, mood: "win" };
    setupSelectMock(true, true);
    setupUpdateMock(updatedEntry);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ mood: "win" });

    expect(res.status).toBe(200);
    expect(res.body.mood).toBe("win");
  });

  it("allows setting mood to null", async () => {
    const updatedEntry = { ...fakeEntry, mood: null };
    setupSelectMock(true, true);
    setupUpdateMock(updatedEntry);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ mood: null });

    expect(res.status).toBe(200);
    expect(res.body.mood).toBeNull();
  });

  it("calls db.update with correct parameters", async () => {
    setupSelectMock(true, true);
    setupUpdateMock();

    await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "New Title" });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns 404 for soft-deleted entry", async () => {
    setupSelectMock(true, false); // entry not found because deletedAt IS NULL filter

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Journal entry not found");
  });
});
