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
const mockInsert = vi.mocked(db.insert);
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

const fakeMilestone = {
  id: "milestone-uuid-1",
  projectId: "project-uuid-1",
  name: "Cool idea",
  description: "Some details",
  status: "pending",
  dueDate: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fakeTodo = {
  id: "todo-uuid-1",
  projectId: "project-uuid-1",
  title: "Cool idea",
  milestoneId: null,
  isCompleted: false,
  isUrgent: false,
  dueDate: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const URL = "/api/projects/project-uuid-1/parking-lot/item-uuid-1/promote";

let selectCallCount = 0;

/**
 * Setup mocks for ownership check (call 1), item lookup (call 2),
 * and max sort order (call 3).
 */
function setupSelectMocks(
  projectFound: boolean,
  itemFound: boolean,
  maxOrder: number | null = null,
) {
  selectCallCount = 0;
  mockSelect.mockImplementation((..._args: any[]) => {
    selectCallCount++;
    const callNum = selectCallCount;

    if (callNum === 1) {
      // getOwnedProject
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

    if (callNum === 2) {
      // Find parking lot item
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(itemFound ? [fakeItem] : []),
          }),
        }),
      } as any;
    }

    // Call 3: max sort order
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ maxOrder }]),
      }),
    } as any;
  });
}

function setupInsert(record: any) {
  mockInsert.mockImplementation((..._args: any[]) => {
    return {
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([record]),
      }),
    } as any;
  });
}

function setupUpdate() {
  mockUpdate.mockImplementation((..._args: any[]) => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/parking-lot/:pid/promote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post(URL)
      .send({ targetType: "milestone" });
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelectMocks(false, false);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "milestone" });
    expect(res.status).toBe(404);
  });

  it("returns 400 with missing targetType", async () => {
    setupSelectMocks(true, true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 400 with invalid targetType", async () => {
    setupSelectMocks(true, true);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "epic" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
  });

  it("returns 404 if parking lot item not found", async () => {
    setupSelectMocks(true, false);

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "milestone" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Parking lot item not found");
  });

  it("promotes to milestone — returns 200 with created milestone", async () => {
    setupSelectMocks(true, true, 2);
    setupInsert(fakeMilestone);
    setupUpdate();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "milestone" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBeDefined();
    expect(res.body.created.name).toBe("Cool idea");
  });

  it("promotes to todo — returns 200 with created todo", async () => {
    setupSelectMocks(true, true, 5);
    setupInsert(fakeTodo);
    setupUpdate();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "todo" });

    expect(res.status).toBe(200);
    expect(res.body.created).toBeDefined();
    expect(res.body.created.title).toBe("Cool idea");
  });

  it("calls db.insert once for promotion", async () => {
    setupSelectMocks(true, true, 0);
    setupInsert(fakeMilestone);
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "milestone" });

    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it("calls db.update once to archive the item", async () => {
    setupSelectMocks(true, true, 0);
    setupInsert(fakeTodo);
    setupUpdate();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "todo" });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("handles null max sort order (first item)", async () => {
    setupSelectMocks(true, true, null);
    setupInsert(fakeMilestone);
    setupUpdate();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token")
      .send({ targetType: "milestone" });

    expect(res.status).toBe(200);
  });
});
