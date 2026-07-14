 
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
  buildProjectContext: vi.fn().mockResolvedValue(
    "Project: Test App (software)\nVision: Build stuff\nStatus: active | Progress: 50%",
  ),
}));

// Mock OpenAI
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [
    { message: { content: "Here is my AI advice for your project." } },
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
  content: [{ type: "text", text: "Anthropic advice for your project." }],
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

const fakeProject = {
  id: "proj-uuid-123",
  userId: "user-uuid-123",
  name: "Test Project",
};

describe("POST /api/projects/:id/ai/chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOwnedProject.mockResolvedValue(fakeProject as any);
  });

  it("returns 401 without auth token", async () => {
    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .send({ message: "What should I do next?" });

    expect(res.status).toBe(401);
  });

  it("returns 400 if user has no AI key configured", async () => {
    const userNoKey = { ...fakeUser, aiApiKey: null, aiProvider: null };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([userNoKey]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "What should I do next?" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("AI API key not configured");
  });

  it("returns 400 if message is empty", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "" });

    expect(res.status).toBe(400);
  });

  it("returns 400 if message is missing", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({});

    expect(res.status).toBe(400);
  });

  it("returns 200 with OpenAI response", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "What should I do next?" });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe(
      "Here is my AI advice for your project.",
    );
  });

  it("returns 200 with Anthropic response", async () => {
    const anthropicUser = { ...fakeUser, aiProvider: "anthropic" };
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([anthropicUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "What should I do next?" });

    expect(res.status).toBe(200);
    expect(res.body.response).toBe(
      "Anthropic advice for your project.",
    );
  });

  it("returns 404 if project not owned by user", async () => {
    mockGetOwnedProject.mockRejectedValue(
      Object.assign(new Error("Project not found"), { status: 404, statusCode: 404 }),
    );

    const res = await request(app)
      .post("/api/projects/wrong-proj/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "Hello" });

    expect(res.status).toBe(404);
  });

  it("returns 500 if AI API call fails", async () => {
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue([fakeUser]);
    mockSelect.mockReturnValue({
      from: mockFrom,
      where: mockWhere,
      limit: mockLimit,
    } as any);

    // Override OpenAI mock to throw
    mockOpenAICreate.mockRejectedValueOnce(new Error("API key invalid"));

    const res = await request(app)
      .post("/api/projects/proj-uuid-123/ai/chat")
      .set("Authorization", "Bearer valid-token")
      .send({ message: "What should I do next?" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI service unavailable");
  });
});
