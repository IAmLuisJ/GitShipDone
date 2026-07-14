 
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

function makeEvent(i: number, type = "journal") {
  return {
    id: `event-uuid-${i}`,
    projectId: "project-uuid-1",
    type,
    refId: null,
    payload: { title: `Event ${i}` },
    createdAt: new Date(Date.now() - i * 60000),
  };
}

const URL = "/api/projects/project-uuid-1/timeline";

/**
 * Sets up the select mock for ownership check + events list + count queries.
 */
function setupMocks(opts: {
  projectFound?: boolean;
  events?: any[];
  total?: number;
}) {
  const { projectFound = true, events = [], total = 0 } = opts;
  let callCount = 0;

  mockSelect.mockImplementation(() => {
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
      // Timeline events query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(events),
              }),
            }),
          }),
        }),
      } as any;
    }
    // Count query
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ total }]),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id/timeline", () => {
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

  it("returns events with pagination metadata", async () => {
    const events = [
      makeEvent(1, "journal"),
      makeEvent(2, "milestone_completed"),
      makeEvent(3, "points_change"),
    ];
    setupMocks({ events, total: 3 });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(3);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it("returns empty array when no events", async () => {
    setupMocks({ events: [], total: 0 });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("filters by single event type", async () => {
    const events = [makeEvent(1, "journal")];
    setupMocks({ events, total: 1 });

    const res = await request(app)
      .get(`${URL}?type=journal`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].type).toBe("journal");
  });

  it("filters by comma-separated event types", async () => {
    const events = [
      makeEvent(1, "journal"),
      makeEvent(2, "milestone_completed"),
    ];
    setupMocks({ events, total: 2 });

    const res = await request(app)
      .get(`${URL}?type=journal,milestone_completed`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(2);
  });

  it("ignores invalid type filter values", async () => {
    setupMocks({ events: [], total: 0 });

    const res = await request(app)
      .get(`${URL}?type=bogus_type`)
      .set("Authorization", "Bearer valid-token");

    // Invalid types are filtered out, results in no type filter applied
    expect(res.status).toBe(200);
  });

  it("respects page and limit query parameters", async () => {
    setupMocks({ events: [makeEvent(3)], total: 5 });

    const res = await request(app)
      .get(`${URL}?page=2&limit=2`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
  });

  it("caps limit at 100", async () => {
    setupMocks({ events: [], total: 0 });

    const res = await request(app)
      .get(`${URL}?limit=200`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(100);
  });

  it("defaults to page 1 and limit 50 with invalid params", async () => {
    setupMocks({ events: [], total: 0 });

    const res = await request(app)
      .get(`${URL}?page=abc&limit=xyz`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(50);
  });

  it("calls db.select for ownership, events, and count", async () => {
    setupMocks({ events: [], total: 0 });

    await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    // 1 for ownership, 2 for events + count
    expect(mockSelect).toHaveBeenCalledTimes(3);
  });
});
