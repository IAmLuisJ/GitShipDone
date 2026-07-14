 
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

// Mock GitHub service
vi.mock("../services/githubService", () => ({
  getOctokit: vi.fn(),
  getRepo: vi.fn(),
  importCommits: vi.fn(),
  importCommitsForProject: vi.fn(),
}));

// Mock encryption
vi.mock("../utils/encryption", () => ({
  encrypt: vi.fn((val: string) => `encrypted:${val}`),
  decrypt: vi.fn((val: string) => val.replace("encrypted:", "")),
}));

// Mock project ownership
vi.mock("../utils/projectOwnership", () => ({
  getOwnedProject: vi.fn(),
}));

// Mock AI context builder
vi.mock("../services/aiContextService", () => ({
  buildProjectContext: vi
    .fn()
    .mockResolvedValue(
      "Project: Test App (software)\nVision: Build stuff\nStatus: active | Progress: 50%",
    ),
}));

// Mock OpenAI
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content:
          "1. Research dark mode patterns\n2. Add theme toggle\n3. Update CSS variables\n4. Test across pages",
      },
    },
  ],
});

vi.mock("openai", () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockOpenAICreate,
        },
      };
    },
  };
});

// Mock Anthropic
const mockAnthropicCreate = vi.fn().mockResolvedValue({
  content: [
    {
      type: "text",
      text: "1. Define theme tokens\n2. Implement toggle\n3. Persist preference",
    },
  ],
});

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockAnthropicCreate,
      };
    },
  };
});

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
import { getOwnedProject } from "../utils/projectOwnership";

const mockSelect = vi.mocked(db.select);
const mockUpdate = vi.mocked(db.update);
const mockGetOwnedProject = vi.mocked(getOwnedProject);

const fakeUser = {
  id: "user-uuid-123",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: null,
  passwordHash: "$2b$10$secrethash",
  githubId: null,
  googleId: null,
  githubAccessToken: null,
  aiProvider: "openai",
  aiApiKey: "encrypted:sk-1234567890abcdef",
  emailNotificationsEnabled: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  deletedAt: null,
};

const fakeItem = {
  id: "item-uuid-123",
  projectId: "proj-uuid-123",
  title: "Add dark mode",
  description: "Support dark and light themes with a toggle",
  aiPathway: null,
  archivedAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const fakeProject = {
  id: "proj-uuid-123",
  userId: "user-uuid-123",
  name: "Test Project",
};

const BASE_URL =
  "/api/projects/proj-uuid-123/parking-lot/item-uuid-123/ai-pathway";

/**
 * Helper to set up select mock that returns user first, then item.
 */
function setupSelectMocks(userResult: any, itemResult: any) {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    const currentCall = callCount;
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue(currentCall === 1 ? userResult : itemResult),
        }),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/parking-lot/:pid/ai-pathway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwnedProject.mockResolvedValue(fakeProject as any);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app).post(BASE_URL).send();
    expect(res.status).toBe(401);
  });

  it("returns 400 if user has no AI key configured", async () => {
    const userNoKey = { ...fakeUser, aiApiKey: null, aiProvider: null };
    setupSelectMocks([userNoKey], [fakeItem]);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("AI API key not configured");
  });

  it("returns 404 if parking lot item not found", async () => {
    setupSelectMocks([fakeUser], []);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Parking lot item not found");
  });

  it("returns 200 with OpenAI pathway and saves to DB", async () => {
    setupSelectMocks([fakeUser], [fakeItem]);

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.pathway).toContain("1. Research dark mode patterns");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiPathway: expect.stringContaining("Research dark mode"),
      }),
    );
  });

  it("returns 200 with Anthropic pathway", async () => {
    const anthropicUser = { ...fakeUser, aiProvider: "anthropic" };
    setupSelectMocks([anthropicUser], [fakeItem]);

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.pathway).toContain("1. Define theme tokens");
  });

  it("returns 404 if project not owned by user", async () => {
    mockGetOwnedProject.mockRejectedValue(
      Object.assign(new Error("Project not found"), {
        status: 404,
        statusCode: 404,
      }),
    );

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(404);
  });

  it("returns 500 if AI API call fails", async () => {
    setupSelectMocks([fakeUser], [fakeItem]);
    mockOpenAICreate.mockRejectedValueOnce(new Error("API key invalid"));

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI service unavailable");
  });

  it("includes item description in prompt when available", async () => {
    setupSelectMocks([fakeUser], [fakeItem]);

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(mockOpenAICreate).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            content: expect.stringContaining(
              "Support dark and light themes with a toggle",
            ),
          }),
        ],
      }),
    );
  });
});
