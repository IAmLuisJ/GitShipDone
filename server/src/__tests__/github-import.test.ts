 
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB
vi.mock("../db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

// Mock points service
vi.mock("../services/pointsService", () => ({
  awardPoints: vi.fn().mockResolvedValue({ newTotal: 10, level: "Seed", didLevelUp: false }),
}));

// Mock timeline service
vi.mock("../services/timelineService", () => ({
  logTimelineEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock encryption
vi.mock("../utils/encryption", () => ({
  decrypt: vi.fn((token: string) => `decrypted-${token}`),
}));

import { db } from "../db";
import { awardPoints } from "../services/pointsService";
import { logTimelineEvent } from "../services/timelineService";
import { importCommitsForProject, importCommits, getOctokit } from "../services/githubService";

const mockInsert = vi.mocked(db.insert);
const mockAwardPoints = vi.mocked(awardPoints);
const mockLogTimelineEvent = vi.mocked(logTimelineEvent);

function makeCommit(sha: string, message: string, date: string) {
  return {
    sha,
    html_url: `https://github.com/owner/repo/commit/${sha}`,
    commit: {
      message,
      author: { name: "Author", email: "a@b.com", date },
      committer: { date },
    },
  };
}

function makeRelease(tagName: string, publishedAt: string) {
  return {
    tag_name: tagName,
    name: `Release ${tagName}`,
    body: `Notes for ${tagName}`,
    published_at: publishedAt,
    html_url: `https://github.com/owner/repo/releases/tag/${tagName}`,
  };
}

function createMockOctokit(commits: any[] = [], releases: any[] = []) {
  const octokit = {
    repos: {
      listCommits: vi.fn(),
      listReleases: vi.fn().mockResolvedValue({ data: releases }),
    },
    paginate: vi.fn().mockResolvedValue(commits),
  } as any;
  return octokit;
}

function setupInsert(rowCount: number) {
  const mockOnConflict = vi.fn().mockResolvedValue({ rowCount });
  const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflict });
  mockInsert.mockReturnValue({ values: mockValues } as any);
  return { mockValues, mockOnConflict };
}

describe("importCommitsForProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is exported and callable", () => {
    expect(typeof importCommitsForProject).toBe("function");
  });

  it("importCommits is an alias for importCommitsForProject", () => {
    expect(importCommits).toBe(importCommitsForProject);
  });

  it("fetches commits from the last 90 days via octokit.paginate", async () => {
    const octokit = createMockOctokit();
    setupInsert(0);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(octokit.paginate).toHaveBeenCalledWith(
      octokit.repos.listCommits,
      expect.objectContaining({
        owner: "owner",
        repo: "repo",
        per_page: 100,
      }),
    );

    // Verify the since date is approximately 90 days ago
    const callArgs = octokit.paginate.mock.calls[0][1];
    const sinceDate = new Date(callArgs.since);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const diffMs = Math.abs(sinceDate.getTime() - ninetyDaysAgo.getTime());
    expect(diffMs).toBeLessThan(5000); // within 5 seconds
  });

  it("inserts new commits into the database with ON CONFLICT DO NOTHING", async () => {
    const commits = [makeCommit("abc1234", "feat: init", "2026-03-01T00:00:00Z")];
    const octokit = createMockOctokit(commits);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockInsert).toHaveBeenCalled();
  });

  it("awards +2 points per new commit", async () => {
    const commits = [
      makeCommit("aaa1111", "fix: bug", "2026-03-01T00:00:00Z"),
      makeCommit("bbb2222", "feat: add", "2026-03-02T00:00:00Z"),
    ];
    const octokit = createMockOctokit(commits);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockAwardPoints).toHaveBeenCalledTimes(2);
    expect(mockAwardPoints).toHaveBeenCalledWith(
      "proj-1",
      2,
      expect.stringContaining("aaa1111"),
      "github_commit",
    );
    expect(mockAwardPoints).toHaveBeenCalledWith(
      "proj-1",
      2,
      expect.stringContaining("bbb2222"),
      "github_commit",
    );
  });

  it("logs a github_commit timeline event for each new commit", async () => {
    const commits = [makeCommit("ccc3333", "docs: readme", "2026-03-05T00:00:00Z")];
    const octokit = createMockOctokit(commits);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockLogTimelineEvent).toHaveBeenCalledWith(
      "proj-1",
      "github_commit",
      expect.objectContaining({
        sha: "ccc3333",
        message: "docs: readme",
        authorName: "Author",
      }),
    );
  });

  it("skips points and timeline for already-existing commits (rowCount 0)", async () => {
    const commits = [makeCommit("ddd4444", "existing", "2026-03-01T00:00:00Z")];
    const octokit = createMockOctokit(commits);
    setupInsert(0); // rowCount = 0 means conflict / already exists

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockAwardPoints).not.toHaveBeenCalled();
    expect(mockLogTimelineEvent).not.toHaveBeenCalled();
  });

  it("imports releases from the last 90 days", async () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago
    const releases = [makeRelease("v1.0.0", recent)];
    const octokit = createMockOctokit([], releases);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(octokit.repos.listReleases).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      per_page: 100,
    });
  });

  it("awards +25 points per new release", async () => {
    const recent = new Date().toISOString();
    const releases = [makeRelease("v2.0.0", recent)];
    const octokit = createMockOctokit([], releases);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockAwardPoints).toHaveBeenCalledWith(
      "proj-1",
      25,
      "Release v2.0.0",
      "github_release",
    );
  });

  it("logs a github_release timeline event for each new release", async () => {
    const recent = new Date().toISOString();
    const releases = [makeRelease("v3.0.0", recent)];
    const octokit = createMockOctokit([], releases);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockLogTimelineEvent).toHaveBeenCalledWith(
      "proj-1",
      "github_release",
      expect.objectContaining({
        tagName: "v3.0.0",
        name: "Release v3.0.0",
      }),
    );
  });

  it("skips releases older than 90 days", async () => {
    const old = new Date(2025, 0, 1).toISOString(); // well over 90 days ago
    const releases = [makeRelease("v0.1.0", old)];
    const octokit = createMockOctokit([], releases);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    // awardPoints should not be called for releases (commits had no data either)
    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  it("skips releases without published_at date", async () => {
    const releases = [{ ...makeRelease("v0.2.0", new Date().toISOString()), published_at: null }];
    const octokit = createMockOctokit([], releases);
    setupInsert(1);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockAwardPoints).not.toHaveBeenCalled();
  });

  it("does not throw when commit fetch fails", async () => {
    const octokit = createMockOctokit();
    octokit.paginate.mockRejectedValue(new Error("API error"));
    octokit.repos.listReleases.mockResolvedValue({ data: [] });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      importCommitsForProject("proj-1", octokit, "owner", "repo"),
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  it("does not throw when release fetch fails", async () => {
    const octokit = createMockOctokit();
    octokit.repos.listReleases.mockRejectedValue(new Error("API error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      importCommitsForProject("proj-1", octokit, "owner", "repo"),
    ).resolves.toBeUndefined();

    consoleSpy.mockRestore();
  });

  it("skips duplicate releases (rowCount 0) without awarding points", async () => {
    const recent = new Date().toISOString();
    const releases = [makeRelease("v1.0.0", recent)];
    const octokit = createMockOctokit([], releases);
    setupInsert(0);

    await importCommitsForProject("proj-1", octokit, "owner", "repo");

    expect(mockAwardPoints).not.toHaveBeenCalled();
    expect(mockLogTimelineEvent).not.toHaveBeenCalled();
  });
});

describe("getOctokit", () => {
  it("creates an Octokit instance with decrypted token", () => {
    const result = getOctokit("encrypted-token");
    expect(result).toBeDefined();
  });
});
