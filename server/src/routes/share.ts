import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { eq } from "drizzle-orm";

import { db } from "../db";
import { projects } from "../db/schema";
import { getOwnedProject } from "../utils/projectOwnership";

const router = Router({ mergeParams: true });

/**
 * POST /api/projects/:id/share/enable
 * Enable project sharing by generating a unique UUID share token
 * and setting is_public = true. Idempotent — returns existing token
 * if already enabled.
 */
router.post(
  "/enable",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await getOwnedProject(projectId, req.userId!);

      const shareToken = project.shareToken ?? crypto.randomUUID();

      if (!project.isPublic || !project.shareToken) {
        await db
          .update(projects)
          .set({
            isPublic: true,
            shareToken,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));
      }

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      res.status(200).json({
        shareToken,
        shareUrl: `${frontendUrl}/share/${shareToken}`,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/projects/:id/share/revoke
 * Revoke the current share token (old URL becomes invalid),
 * generate a new token, and set is_public = false.
 */
router.post(
  "/revoke",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      await getOwnedProject(projectId, req.userId!);

      const newToken = crypto.randomUUID();

      await db
        .update(projects)
        .set({
          isPublic: false,
          shareToken: newToken,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      res.status(200).json({ message: "Share link revoked" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
