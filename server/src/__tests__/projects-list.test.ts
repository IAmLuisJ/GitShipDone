 
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

// Mock JWT verification to set req.userId
vi.mock("../utils/jwt", () => ({
  signAccessToken: vi.fn(() => "mock-access-token"),
  signRefreshToken: vi.fn(() => "mock-refresh-token"),
  verifyAccessToken: vi.fn((token: string) => {
    if (token === "valid-token") return { sub: "user-uuid-123" };
    if (token === "other-user-token") return { sub: "user-uuid-456" };
    throw new Error("Invalid token");
  }),
  verifyRefreshToken: vi.fn(),
}));

import app from "../app";

// Mock the DB module
vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { db } from "../db";

const mockSelect = vi.mocked(db.select);

const now = new Date();
const earlier = new Date(now.getTime() - 60000);

const fakeProject1 = {
  id: "project-uuid-1",
  userId: "user-uuid-123",
  name: "Project Alpha",
  type: "software",
  status: "active",
  progressAuto: 25,
  progressManual: null,
  pointsTotal: 100,
  level: "Sprout",
  isPublic: false,
  updatedAt: now,
  deletedAt: null,
};

const fakeProject2 = {
  id: "project-uuid-2",
  userId: "user-uuid-123",
  name: "Project Beta",
  type: "design",
  status: "active",
  progressAuto: 50,
  progressManual: null,
  pointsTotal: 200,
  level: "Sapling",
  isPublic: true,
  updatedAt: earlier,
  deletedAt: null,
};

function setupSelectMock(results: any[]) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(results),
        }),
      }),
    }),
  } as any);
}

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).get("/api/projects");
    expect(res.status).toBe(401);
  });

  it("returns 200 with array of projects", async () => {
    setupSelectMock([fakeProject1, fakeProject2]);

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it("returns projects sorted by updatedAt descending", async () => {
    setupSelectMock([fakeProject1, fakeProject2]);

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body[0].name).toBe("Project Alpha");
    expect(res.body[1].name).toBe("Project Beta");
  });

  it("returns expected fields for each project", async () => {
    setupSelectMock([fakeProject1]);

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    const project = res.body[0];
    expect(project).toHaveProperty("id");
    expect(project).toHaveProperty("name");
    expect(project).toHaveProperty("type");
    expect(project).toHaveProperty("status");
    expect(project).toHaveProperty("progressAuto");
    expect(project).toHaveProperty("pointsTotal");
    expect(project).toHaveProperty("level");
    expect(project).toHaveProperty("isPublic");
    expect(project).toHaveProperty("updatedAt");
  });

  it("returns empty array when user has no projects", async () => {
    setupSelectMock([]);

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("calls db.select with correct chain (from → where → orderBy → limit)", async () => {
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom } as any);

    await request(app)
      .get("/api/projects")
      .set("Authorization", "Bearer valid-token");

    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockFrom).toHaveBeenCalledOnce();
    expect(mockWhere).toHaveBeenCalledOnce();
    expect(mockOrderBy).toHaveBeenCalledOnce();
    expect(mockLimit).toHaveBeenCalledWith(50);
  });
});
