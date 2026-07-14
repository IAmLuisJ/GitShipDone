 
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

const URL = "/api/projects/project-uuid-1/parking-lot/item-uuid-1";

let selectCallCount = 0;

function setupOwnershipAndItem(
  projectFound: boolean,
  itemFound: boolean,
  item: any = fakeItem,
) {
  selectCallCount = 0;
  mockSelect.mockImplementation((..._args: any[]) => {
    selectCallCount++;
    const callNum = selectCallCount;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            if (callNum === 1) {
              return Promise.resolve(projectFound ? [fakeProject] : []);
            }
            return Promise.resolve(itemFound ? [item] : []);
          }),
        }),
      }),
    } as any;
  });
}

function setupUpdate(item: any = fakeItem) {
  mockUpdate.mockImplementation((..._args: any[]) => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([item]),
        }),
      }),
    } as any;
  });
}

describe("PATCH /api/projects/:id/parking-lot/:pid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).patch(URL).send({ title: "Updated" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupOwnershipAndItem(false, false);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
  });

  it("returns 404 if item not found", async () => {
    setupOwnershipAndItem(true, false);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Parking lot item not found");
  });

  it("returns 400 with empty body (no fields)", async () => {
    setupOwnershipAndItem(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("At least one field must be provided");
  });

  it("returns 400 with empty title", async () => {
    setupOwnershipAndItem(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 with title exceeding 500 chars", async () => {
    setupOwnershipAndItem(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("returns 400 with description exceeding 2000 chars", async () => {
    setupOwnershipAndItem(true, true);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ description: "x".repeat(2001) });
    expect(res.status).toBe(400);
  });

  it("returns 200 with updated title", async () => {
    const updated = { ...fakeItem, title: "Updated idea" };
    setupOwnershipAndItem(true, true);
    setupUpdate(updated);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated idea" });

    expect(res.status).toBe(200);
    expect(res.body.item.title).toBe("Updated idea");
  });

  it("returns 200 with updated description", async () => {
    const updated = { ...fakeItem, description: "New desc" };
    setupOwnershipAndItem(true, true);
    setupUpdate(updated);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ description: "New desc" });

    expect(res.status).toBe(200);
    expect(res.body.item.description).toBe("New desc");
  });

  it("archives item when archived=true", async () => {
    const archivedDate = new Date();
    const updated = { ...fakeItem, archivedAt: archivedDate };
    setupOwnershipAndItem(true, true);
    setupUpdate(updated);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ archived: true });

    expect(res.status).toBe(200);
    expect(res.body.item.archivedAt).toBeDefined();
    expect(res.body.item.archivedAt).not.toBeNull();
  });

  it("unarchives item when archived=false", async () => {
    const archivedItem = { ...fakeItem, archivedAt: new Date() };
    const updated = { ...fakeItem, archivedAt: null };
    setupOwnershipAndItem(true, true, archivedItem);
    setupUpdate(updated);

    const res = await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ archived: false });

    expect(res.status).toBe(200);
    expect(res.body.item.archivedAt).toBeNull();
  });

  it("calls db.update exactly once", async () => {
    setupOwnershipAndItem(true, true);
    setupUpdate();

    await request(app)
      .patch(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ title: "Updated" });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });
});
