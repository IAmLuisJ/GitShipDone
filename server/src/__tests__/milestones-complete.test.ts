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
    newTotal: 50,
    level: "Seed",
    didLevelUp: false,
  }),
}));

import { db } from "../db";
import { awardPoints } from "../services/pointsService";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
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

const fakeMilestone = {
  id: "milestone-uuid-1",
  projectId: "project-uuid-1",
  name: "Alpha Release",
  description: null,
  status: "pending",
  dueDate: null,
  sortOrder: 0,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let selectCallCount = 0;

function setupSelectMocks(options: {
  projectFound?: boolean;
  milestone?: any | null;
  updatedProject?: any;
}) {
  const {
    projectFound = true,
    milestone = fakeMilestone,
    updatedProject = { ...fakeProject, pointsTotal: 50 },
  } = options;

  selectCallCount = 0;
  mockSelect.mockImplementation(() => {
    selectCallCount++;
    if (selectCallCount === 1) {
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
    if (selectCallCount === 2) {
      // Find milestone
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue(milestone ? [milestone] : []),
          }),
        }),
      } as any;
    }
    // Fetch updated project
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([updatedProject]),
        }),
      }),
    } as any;
  });
}

function setupUpdateMock(returnedMilestone: any) {
  mockUpdate.mockImplementation(() => {
    return {
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([returnedMilestone]),
        }),
      }),
    } as any;
  });
}

function setupInsertMock() {
  mockInsert.mockImplementation(() => {
    return {
      values: vi.fn().mockResolvedValue([]),
    } as any;
  });
}

const URL = "/api/projects/project-uuid-1/milestones/milestone-uuid-1/complete";

describe("POST /api/projects/:id/milestones/:mid/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallCount = 0;
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post(URL);
    expect(res.status).toBe(401);
  });

  it("returns 404 if project not found", async () => {
    setupSelectMocks({ projectFound: false });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
  });

  it("returns 404 if milestone not found", async () => {
    setupSelectMocks({ milestone: null });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Milestone not found");
  });

  it("returns 400 if milestone is already completed", async () => {
    const completedMilestone = { ...fakeMilestone, status: "completed" };
    setupSelectMocks({ milestone: completedMilestone });

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Milestone is already completed");
  });

  it("returns 200 with milestone and project on success", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    const updatedProject = { ...fakeProject, pointsTotal: 50 };

    setupSelectMocks({ updatedProject });
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.milestone.status).toBe("completed");
    expect(res.body.project.pointsTotal).toBe(50);
  });

  it("sets milestone status to completed and completedAt", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    setupSelectMocks({});
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it("calls awardPoints with 50 points and milestone source", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    setupSelectMocks({});
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(mockAwardPoints).toHaveBeenCalledWith(
      "project-uuid-1",
      50,
      "Milestone completed: Alpha Release",
      "milestone",
    );
  });

  it("inserts milestone_completed timeline event", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    setupSelectMocks({});
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    // insert is called for timeline event
    expect(mockInsert).toHaveBeenCalled();
    const insertCall = mockInsert.mock.calls[0];
    expect(insertCall).toBeDefined();
  });

  it("returns updated project with new points total", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    const updatedProject = { ...fakeProject, pointsTotal: 50, level: "Seed" };

    setupSelectMocks({ updatedProject });
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.project.pointsTotal).toBe(50);
    expect(res.body.project.level).toBe("Seed");
    expect(res.body.didLevelUp).toBe(false);
    expect(res.body.newLevel).toBe("Seed");
  });

  it("returns level-up metadata when completion crosses a threshold", async () => {
    const completedMilestone = {
      ...fakeMilestone,
      status: "completed",
      completedAt: new Date(),
    };
    const updatedProject = { ...fakeProject, pointsTotal: 300, level: "Growing" };
    mockAwardPoints.mockResolvedValueOnce({
      newTotal: 300,
      level: "Growing",
      didLevelUp: true,
    });

    setupSelectMocks({ updatedProject });
    setupUpdateMock(completedMilestone);
    setupInsertMock();

    const res = await request(app)
      .post(URL)
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBe(200);
    expect(res.body.didLevelUp).toBe(true);
    expect(res.body.newLevel).toBe("Growing");
  });
});
