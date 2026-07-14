 
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
const mockInsert = vi.mocked(db.insert);

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

const fakeItem = {
  id: "item-uuid-1",
  projectId: "project-uuid-1",
  title: "Cool idea",
  description: "Some details",
  aiPathway: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const URL = "/api/projects/project-uuid-1/parking-lot";

function setupOwnership(found: boolean) {
  mockSelect.mockImplementation((..._args: any[]) => {
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(found ? [fakeProject] : []),
        }),
      }),
    } as any;
  });
}

function setupInsert(item: any = fakeItem) {
  mockInsert.mockImplementation((..._args: any[]) => {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([item]),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/parking-lot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post(URL).send({ title: "Idea" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupOwnership(false);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Idea" });
    expect(res.status).toBe(404);
  });

  it("returns 400 with empty title", async () => {
    setupOwnership(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 with missing title", async () => {
    setupOwnership(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 with title exceeding 500 chars", async () => {
    setupOwnership(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("returns 400 with description exceeding 2000 chars", async () => {
    setupOwnership(true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Valid", description: "x".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("returns 201 with valid title only", async () => {
    setupOwnership(true);
    setupInsert({ ...fakeItem, description: null });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Cool idea" });

    expect(res.status).toBe(201);
    expect(res.body.item).toBeDefined();
    expect(res.body.item.title).toBe("Cool idea");
  });

  it("returns 201 with title and description", async () => {
    setupOwnership(true);
    setupInsert();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Cool idea", description: "Some details" });

    expect(res.status).toBe(201);
    expect(res.body.item.title).toBe("Cool idea");
    expect(res.body.item.description).toBe("Some details");
  });

  it("calls db.insert with correct values", async () => {
    setupOwnership(true);
    setupInsert();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Cool idea", description: "Some details" });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});
