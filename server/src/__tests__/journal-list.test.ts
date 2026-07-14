 
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

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

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

function makeEntry(i: number) {
  return {
    id: `entry-uuid-${i}`,
    projectId: "project-uuid-1",
    title: `Entry ${i}`,
    body: `Body ${i}`,
    mood: "steady",
    createdAt: new Date(Date.now() - i * 60000),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

const URL = "/api/projects/project-uuid-1/journal";

/**
 * Sets up the select mock to handle both the ownership check (first call)
 * and the journal list + count queries (second call via Promise.all).
 */
function setupMocks(opts: {
  projectFound?: boolean;
  entries?: any[];
  total?: number;
}) {
  const { projectFound = true, entries = [], total = 0 } = opts;
  let callCount = 0;

  mockSelect.mockImplementation((...args: any[]) => {
    callCount++;
    if (callCount === 1) {
      // Project ownership check
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
    if (callCount === 2) {
      // Journal entries query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(entries),
              }),
            }),
          }),
        }),
      } as any;
    }
    // Count query
    const hasCountArg =
      args.length > 0 &&
      typeof args[0] === "object" &&
      args[0] !== null &&
      "total" in args[0];
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          hasCountArg ? { total } : { total },
        ]),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id/journal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get(URL);
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupMocks({ projectFound: false });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns entries with pagination metadata", async () => {
    const entries = [makeEntry(1), makeEntry(2), makeEntry(3)];
    setupMocks({ entries, total: 3 });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("returns empty array when no entries", async () => {
    setupMocks({ entries: [], total: 0 });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.entries).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("respects page query parameter", async () => {
    setupMocks({ entries: [makeEntry(21)], total: 25 });

    const res = await request(app)
      .get(`${URL}?page=2`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
  });

  it("respects limit query parameter", async () => {
    setupMocks({ entries: [makeEntry(1)], total: 1 });

    const res = await request(app)
      .get(`${URL}?limit=5`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(5);
  });

  it("caps limit at 100", async () => {
    setupMocks({ entries: [], total: 0 });

    const res = await request(app)
      .get(`${URL}?limit=200`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it("defaults to page 1 and limit 20 with invalid params", async () => {
    setupMocks({ entries: [], total: 0 });

    const res = await request(app)
      .get(`${URL}?page=abc&limit=xyz`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("calls db.select for entries and count", async () => {
    setupMocks({ entries: [], total: 0 });

    await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    // 1 for ownership, 2 for entries + count
    expect(mockSelect).toHaveBeenCalledTimes(3);
  });
});
