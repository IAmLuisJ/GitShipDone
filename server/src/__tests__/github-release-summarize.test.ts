 
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

// Mock OpenAI
const mockOpenAICreate = vi.fn().mockResolvedValue({
  choices: [
    {
      message: {
        content:
          "## Features\n- Add dark mode support\n\n## Fixes\n- Fix login redirect",
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
      text: "## Features\n- New dashboard layout\n\n## Other\n- Updated deps",
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

const fakeRelease = {
  id: "release-uuid-123",
  projectId: "proj-uuid-123",
  tagName: "v1.2.0",
  name: "Release 1.2.0",
  body: "Some release notes",
  aiSummary: null,
  publishedAt: new Date("2026-03-15"),
  url: "https://github.com/owner/repo/releases/tag/v1.2.0",
  createdAt: new Date("2026-03-15"),
};

const fakePreviousRelease = {
  id: "release-uuid-100",
  projectId: "proj-uuid-123",
  tagName: "v1.1.0",
  name: "Release 1.1.0",
  body: null,
  aiSummary: null,
  publishedAt: new Date("2026-02-01"),
  url: "https://github.com/owner/repo/releases/tag/v1.1.0",
  createdAt: new Date("2026-02-01"),
};

const fakeCommits = [
  {
    id: "commit-1",
    projectId: "proj-uuid-123",
    sha: "abc123",
    message: "feat: add dark mode",
    authorName: "Dev",
    authorEmail: "dev@test.com",
    committedAt: new Date("2026-02-15"),
    url: "https://github.com/owner/repo/commit/abc123",
    createdAt: new Date("2026-02-15"),
  },
  {
    id: "commit-2",
    projectId: "proj-uuid-123",
    sha: "def456",
    message: "fix: login redirect",
    authorName: "Dev",
    authorEmail: "dev@test.com",
    committedAt: new Date("2026-03-01"),
    url: "https://github.com/owner/repo/commit/def456",
    createdAt: new Date("2026-03-01"),
  },
];

const fakeProject = {
  id: "proj-uuid-123",
  userId: "user-uuid-123",
  name: "Test Project",
};

const BASE_URL =
  "/api/projects/proj-uuid-123/github/releases/release-uuid-123/summarize";

/**
 * Helper to set up chained select mocks.
 * Calls return results in order: user, release, previousRelease, commits.
 */
function setupSelectMocks(
  userResult: any,
  releaseResult: any,
  previousReleaseResult?: any,
  commitsResult?: any,
) {
  let callCount = 0;
  mockSelect.mockImplementation(() => {
    callCount++;
    const currentCall = callCount;

    if (currentCall === 1) {
      // User query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(userResult),
          }),
        }),
      } as any;
    }

    if (currentCall === 2) {
      // Release query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(releaseResult),
          }),
        }),
      } as any;
    }

    if (currentCall === 3) {
      // Previous release query
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi
                .fn()
                .mockResolvedValue(previousReleaseResult ?? []),
            }),
          }),
        }),
      } as any;
    }

    // Commits query
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(commitsResult ?? []),
        }),
      }),
    } as any;
  });
}

describe("POST /api/projects/:id/github/releases/:rid/summarize", () => {
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
    setupSelectMocks([userNoKey], [fakeRelease]);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("AI API key not configured");
  });

  it("returns 404 if release not found", async () => {
    setupSelectMocks([fakeUser], []);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Release not found");
  });

  it("returns 200 with OpenAI summary and saves to DB", async () => {
    setupSelectMocks(
      [fakeUser],
      [fakeRelease],
      [fakePreviousRelease],
      fakeCommits,
    );

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.summary).toContain("Features");
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aiSummary: expect.stringContaining("Features"),
      }),
    );
  });

  it("returns 200 with Anthropic summary", async () => {
    const anthropicUser = { ...fakeUser, aiProvider: "anthropic" };
    setupSelectMocks(
      [anthropicUser],
      [fakeRelease],
      [fakePreviousRelease],
      fakeCommits,
    );

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.summary).toContain("New dashboard layout");
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
    setupSelectMocks(
      [fakeUser],
      [fakeRelease],
      [fakePreviousRelease],
      fakeCommits,
    );
    mockOpenAICreate.mockRejectedValueOnce(new Error("API key invalid"));

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("AI service unavailable");
  });

  it("includes commit messages and tag name in prompt", async () => {
    setupSelectMocks(
      [fakeUser],
      [fakeRelease],
      [fakePreviousRelease],
      fakeCommits,
    );

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
            content: expect.stringContaining("v1.2.0"),
          }),
        ],
      }),
    );

    // Verify commit messages are included
    const callArgs = mockOpenAICreate.mock.calls[0][0];
    const promptContent = callArgs.messages[0].content;
    expect(promptContent).toContain("feat: add dark mode");
    expect(promptContent).toContain("fix: login redirect");
  });

  it("handles release with no previous release (first release)", async () => {
    setupSelectMocks([fakeUser], [fakeRelease], [], fakeCommits);

    const mockSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    mockUpdate.mockReturnValue({ set: mockSet } as any);

    const res = await request(app)
      .post(BASE_URL)
      .set("Authorization", "Bearer valid-token")
      .send();

    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });
});
