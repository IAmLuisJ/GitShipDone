import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "../db";
import { users } from "../db/schema";

const router = Router();

/**
 * GET /api/users/me
 * Return the authenticated user's profile.
 * Sensitive fields (password_hash, tokens, AI keys) are never exposed.
 */
router.get("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), isNull(users.deletedAt)));

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      aiProvider: user.aiProvider,
      hasAiKey: !!user.aiApiKey,
      emailNotificationsEnabled: user.emailNotificationsEnabled,
      githubConnected: !!user.githubAccessToken,
      createdAt: user.createdAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
