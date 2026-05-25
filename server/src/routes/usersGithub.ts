import { Router, Request, Response, NextFunction } from "express";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "../db";
import { users } from "../db/schema";
import { getOctokit, listRepos } from "../services/githubService";

const router = Router();

/**
 * GET /api/users/me/github/repos
 * Return repositories available to the connected GitHub account.
 */
router.get(
  "/repos",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.id, req.userId!), isNull(users.deletedAt)));

      if (rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const user = rows[0];
      if (!user.githubAccessToken) {
        res.status(400).json({
          error: "GitHub account not connected. Please connect GitHub first.",
        });
        return;
      }

      const octokit = getOctokit(user.githubAccessToken);
      const repos = await listRepos(octokit);
      res.json(repos);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
