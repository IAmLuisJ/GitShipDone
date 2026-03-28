import { Router, Request, Response, NextFunction } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "../db";
import { users, refreshTokens } from "../db/schema";
import { encrypt } from "../utils/encryption";

const deleteAccountSchema = z.object({
  confirmPassword: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const aiSettingsSchema = z.object({
  provider: z.enum(["openai", "anthropic"]),
  apiKey: z.string().min(10).max(500),
});

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

/**
 * PATCH /api/users/me/password
 * Change password with current password verification.
 * Not available for OAuth-only accounts (no passwordHash).
 */
router.patch(
  "/me/password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const { currentPassword, newPassword } = parsed.data;

      const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)));

      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = rows[0];

      if (!user.passwordHash) {
        return res
          .status(400)
          .json({ error: "Password login not available for OAuth accounts" });
      }

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const newHash = await bcrypt.hash(newPassword, 12);

      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Invalidate all refresh tokens to force re-login
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      return res.json({ message: "Password changed successfully" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * PATCH /api/users/me/ai-settings
 * Save the user's AI provider choice and encrypted API key.
 */
router.patch(
  "/me/ai-settings",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const parsed = aiSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const { provider, apiKey } = parsed.data;
      const encryptedKey = encrypt(apiKey);

      const rows = await db
        .update(users)
        .set({
          aiProvider: provider,
          aiApiKey: encryptedKey,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .returning();

      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ message: "AI settings saved", provider });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * DELETE /api/users/me
 * Soft delete the user's account. Requires password confirmation.
 * Invalidates all refresh tokens to force logout everywhere.
 */
router.delete(
  "/me",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const parsed = deleteAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const { confirmPassword } = parsed.data;

      const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)));

      if (rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = rows[0];

      if (!user.passwordHash) {
        return res
          .status(400)
          .json({
            error: "Password verification not available for OAuth accounts",
          });
      }

      const valid = await bcrypt.compare(confirmPassword, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Password is incorrect" });
      }

      // Soft delete user
      await db
        .update(users)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Invalidate all refresh tokens
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

      return res.json({ message: "Account deleted" });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
