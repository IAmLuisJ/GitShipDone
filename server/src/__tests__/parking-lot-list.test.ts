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

function makeItem(i: number, archived = false) {
  return {
    id: `item-uuid-${i}`,
    projectId: "project-uuid-1",
    title: `Idea ${i}`,
    description: `Description ${i}`,
    aiPathway: null,
    archivedAt: archived ? new Date() : null,
    createdAt: new Date(Date.now() - i * 60000),
    updatedAt: new Date(),
  };
}

const URL = "/api/projects/project-uuid-1/parking-lot";

function setupMocks(opts: {
  projectFound?: boolean;
  items?: any[];
}) {
  const { projectFound = true, items = [] } = opts;
  let callCount = 0;

  mockSelect.mockImplementation((..._args: any[]) => {
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
    // Parking lot items query
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(items),
        }),
      }),
    } as any;
  });
}

describe("GET /api/projects/:id/parking-lot", () => {
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

  it("returns non-archived items by default", async () => {
    const items = [makeItem(1), makeItem(2)];
    setupMocks({ items });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].title).toBe("Idea 1");
  });

  it("returns empty array when no items", async () => {
    setupMocks({ items: [] });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it("includes archived items when includeArchived=true", async () => {
    const items = [makeItem(1), makeItem(2, true)];
    setupMocks({ items });

    const res = await request(app)
      .get(`${URL}?includeArchived=true`)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
  });

  it("calls db.select for ownership and items", async () => {
    setupMocks({ items: [] });

    await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it("returns items ordered by created_at DESC", async () => {
    const items = [makeItem(1), makeItem(2), makeItem(3)];
    setupMocks({ items });

    const res = await request(app)
      .get(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
    expect(res.body.items[0].id).toBe("item-uuid-1");
    expect(res.body.items[2].id).toBe("item-uuid-3");
  });
});
