import { Router, Request, Response, NextFunction } from "express";
import { eq, and, lt, gte, desc, isNull, asc } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

import { db } from "../db";
import { users, projects, githubReleases, githubCommits } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";
import { connectGithubSchema } from "../validators/github";
import { getOctokit, getRepo, importCommits } from "../services/githubService";
import { decrypt } from "../utils/encryption";

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:id/github/connect
 * Link a GitHub repository to a project.
 * Requires user to have github_access_token set.
 * Triggers background import of last 90 days of commits.
 */
router.post(
  "/connect",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      await getOwnedProject(projectId, req.userId!);

      const parsed = connectGithubSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const { repoOwner, repoName } = parsed.data;

      // Fetch the user to check for github_access_token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.userId!))
        .limit(1);

      if (!user?.githubAccessToken) {
        res.status(400).json({
          error: "GitHub account not connected. Please connect GitHub first.",
        });
        return;
      }

      // Validate repo access via GitHub API
      const octokit = getOctokit(user.githubAccessToken);
      let repoData;
      try {
        repoData = await getRepo(octokit, repoOwner, repoName);
      } catch {
        res.status(400).json({ error: "Repo not found or no access" });
        return;
      }

      // Store repo info on the project
      const fullRepoName = `${repoOwner}/${repoName}`;
      await db
        .update(projects)
        .set({
          githubRepoId: String(repoData.id),
          githubRepoName: fullRepoName,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      // Fire-and-forget: import commits in background
      importCommits(projectId, octokit, repoOwner, repoName).catch(() => {});

      res.json({ repoName: fullRepoName, importStatus: "importing" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/projects/:id/github/disconnect
 * Remove GitHub repo link from a project.
 * Imported commits and releases remain in the database.
 */
router.delete(
  "/disconnect",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await getOwnedProject(projectId, req.userId!);

      if (!project.githubRepoName) {
        res
          .status(400)
          .json({ error: "No GitHub repo is connected to this project" });
        return;
      }

      await db
        .update(projects)
        .set({
          githubRepoId: null,
          githubRepoName: null,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      res.json({ message: "GitHub repo disconnected" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/projects/:id/github/releases/:rid/summarize
 * Generate an AI changelog summary for a release from its commits.
 */
router.post(
  "/releases/:rid/summarize",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const rid = req.params.rid as string;
      const userId = req.userId!;

      await getOwnedProject(projectId, userId);

      // Check user has AI key configured
      const [user] = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);

      if (!user || !user.aiApiKey || !user.aiProvider) {
        res.status(400).json({
          error:
            "AI API key not configured. Please set up AI settings first.",
        });
        return;
      }

      // Find the release
      const [release] = await db
        .select()
        .from(githubReleases)
        .where(
          and(
            eq(githubReleases.id, rid),
            eq(githubReleases.projectId, projectId),
          ),
        )
        .limit(1);

      if (!release) {
        res.status(404).json({ error: "Release not found" });
        return;
      }

      // Find the previous release by published_at
      const [previousRelease] = await db
        .select()
        .from(githubReleases)
        .where(
          and(
            eq(githubReleases.projectId, projectId),
            lt(githubReleases.publishedAt, release.publishedAt),
          ),
        )
        .orderBy(desc(githubReleases.publishedAt))
        .limit(1);

      // Fetch commits between previous release and this one
      const sinceDate = previousRelease?.publishedAt ?? new Date(0);
      const commits = await db
        .select()
        .from(githubCommits)
        .where(
          and(
            eq(githubCommits.projectId, projectId),
            gte(githubCommits.committedAt, sinceDate),
            lt(githubCommits.committedAt, release.publishedAt),
          ),
        )
        .orderBy(asc(githubCommits.committedAt));

      const commitList = commits
        .map((c) => `- ${c.message} (${c.authorName})`)
        .join("\n");

      const prompt =
        `Write a concise changelog for version ${release.tagName} based on these commits:\n${commitList || "(no commits found)"}\n\n` +
        "Use markdown with categories: Features, Fixes, Other. " +
        "Only include categories that have entries.";

      const apiKey = decrypt(user.aiApiKey);
      let summary: string;

      if (user.aiProvider === "openai") {
        const client = new OpenAI({ apiKey });
        const completion = await client.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 1024,
        });
        summary = completion.choices[0]?.message?.content || "";
      } else {
        const client = new Anthropic({ apiKey });
        const message = await client.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        });
        const block = message.content[0];
        summary = block.type === "text" ? block.text : "";
      }

      // Save summary to release
      await db
        .update(githubReleases)
        .set({ aiSummary: summary })
        .where(eq(githubReleases.id, rid));

      res.status(200).json({ summary });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      if (e.status === 404 || e.statusCode === 404) {
        return next(err);
      }
      console.error(
        "[AI Summarize] Error:",
        err instanceof Error ? err.message : String(err),
      );
      res.status(500).json({ error: "AI service unavailable" });
    }
  },
);

export default router;
