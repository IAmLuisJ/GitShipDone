import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { users } from "../db/schema";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatarUrl: z.string().url().max(2000).optional(),
});

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

/**
 * PATCH /api/users/me
 * Update the authenticated user's profile (name and/or avatarUrl).
 * Email changes are not supported in MVP.
 */
router.patch("/me", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Reject email changes in MVP
    if (req.body && "email" in req.body) {
      return res.status(400).json({ error: "Email changes not supported" });
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }

    const updates = parsed.data;

    // Nothing to update
    if (!updates.name && !updates.avatarUrl) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const rows = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .returning();

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
