import { Router, Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { users, projects } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";
import { connectGithubSchema } from "../validators/github";
import { getOctokit, getRepo, importCommits } from "../services/githubService";

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
        res
          .status(400)
          .json({ error: "Repo not found or no access" });
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

export default router;
