 
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node-cron
vi.mock("node-cron", () => ({
  default: { schedule: vi.fn() },
}));

// Mock DB with select chain
vi.mock("../db", () => {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return {
    db: {
      select: mockSelect,
      _mockWhere: mockWhere,
      _mockFrom: mockFrom,
      _mockInnerJoin: mockInnerJoin,
    },
  };
});

// Mock schema
vi.mock("../db/schema", () => ({
  projects: {
    id: "projects.id",
    githubRepoName: "projects.github_repo_name",
    userId: "projects.user_id",
    deletedAt: "projects.deleted_at",
  },
  users: {
    id: "users.id",
    githubAccessToken: "users.github_access_token",
  },
}));

// Mock drizzle-orm operators
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: any[]) => ({ type: "eq", args })),
  isNotNull: vi.fn((col: any) => ({ type: "isNotNull", col })),
  isNull: vi.fn((col: any) => ({ type: "isNull", col })),
  and: vi.fn((...args: any[]) => ({ type: "and", args })),
}));

// Mock github service
vi.mock("../services/githubService", () => ({
  getOctokit: vi.fn().mockReturnValue({ mocked: true }),
  importCommitsForProject: vi.fn().mockResolvedValue(undefined),
}));

import cron from "node-cron";
import { db } from "../db";
import { getOctokit, importCommitsForProject } from "../services/githubService";
import {
  syncAllGithubProjects,
  startGithubSyncJob,
} from "../jobs/githubSync";

const mockSchedule = vi.mocked(cron.schedule);
const mockSelect = vi.mocked(db.select);
const mockWhere = (db as any)._mockWhere as ReturnType<typeof vi.fn>;
const mockGetOctokit = vi.mocked(getOctokit);
const mockImportCommitsForProject = vi.mocked(importCommitsForProject);

describe("GitHub Sync Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWhere.mockResolvedValue([]);
  });

  describe("syncAllGithubProjects", () => {
    it("queries projects with github_repo_name and github_access_token", async () => {
      await syncAllGithubProjects();

      expect(mockSelect).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it("does nothing when no connected projects exist", async () => {
      mockWhere.mockResolvedValue([]);

      await syncAllGithubProjects();

      expect(mockGetOctokit).not.toHaveBeenCalled();
      expect(mockImportCommitsForProject).not.toHaveBeenCalled();
    });

    it("calls getOctokit with the encrypted token for each project", async () => {
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "owner/repo",
          githubAccessToken: "encrypted-token-1",
        },
      ]);

      await syncAllGithubProjects();

      expect(mockGetOctokit).toHaveBeenCalledWith("encrypted-token-1");
    });

    it("calls importCommitsForProject with correct params", async () => {
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "myowner/myrepo",
          githubAccessToken: "enc-tok",
        },
      ]);

      await syncAllGithubProjects();

      expect(mockImportCommitsForProject).toHaveBeenCalledWith(
        "proj-1",
        { mocked: true },
        "myowner",
        "myrepo",
      );
    });

    it("processes multiple projects", async () => {
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "owner1/repo1",
          githubAccessToken: "tok1",
        },
        {
          projectId: "proj-2",
          githubRepoName: "owner2/repo2",
          githubAccessToken: "tok2",
        },
      ]);

      await syncAllGithubProjects();

      expect(mockImportCommitsForProject).toHaveBeenCalledTimes(2);
    });

    it("continues syncing other projects when one fails", async () => {
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "owner1/repo1",
          githubAccessToken: "tok1",
        },
        {
          projectId: "proj-2",
          githubRepoName: "owner2/repo2",
          githubAccessToken: "tok2",
        },
      ]);
      mockImportCommitsForProject
        .mockRejectedValueOnce(new Error("API rate limit"))
        .mockResolvedValueOnce(undefined);

      await syncAllGithubProjects();

      expect(mockImportCommitsForProject).toHaveBeenCalledTimes(2);
      expect(mockImportCommitsForProject).toHaveBeenCalledWith(
        "proj-2",
        { mocked: true },
        "owner2",
        "repo2",
      );
    });

    it("skips projects with invalid repo name format", async () => {
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "invalid-no-slash",
          githubAccessToken: "tok1",
        },
      ]);

      await syncAllGithubProjects();

      expect(mockImportCommitsForProject).not.toHaveBeenCalled();
    });

    it("logs error for invalid repo name format", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "invalid",
          githubAccessToken: "tok1",
        },
      ]);

      await syncAllGithubProjects();

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Invalid repo name format"),
      );
      spy.mockRestore();
    });

    it("logs error when project sync throws", async () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockWhere.mockResolvedValue([
        {
          projectId: "proj-1",
          githubRepoName: "owner/repo",
          githubAccessToken: "tok1",
        },
      ]);
      mockImportCommitsForProject.mockRejectedValueOnce(
        new Error("Network error"),
      );

      await syncAllGithubProjects();

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Error syncing project proj-1"),
        expect.any(Error),
      );
      spy.mockRestore();
    });
  });

  describe("startGithubSyncJob", () => {
    it("schedules cron job with hourly schedule", () => {
      startGithubSyncJob();

      expect(mockSchedule).toHaveBeenCalledWith(
        "0 * * * *",
        expect.any(Function),
      );
    });

    it("logs startup message", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});

      startGithubSyncJob();

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("Cron job scheduled"),
      );
      spy.mockRestore();
    });

    it("triggers initial sync on startup", () => {
      startGithubSyncJob();

      // syncAllGithubProjects is called immediately (select is invoked)
      expect(mockSelect).toHaveBeenCalled();
    });
  });
});
