import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt, isNull } from "drizzle-orm";
import { db } from "../db";
import { users, refreshTokens, passwordResetTokens } from "../db/schema";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
} from "../validators/auth";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import { AppError } from "../middleware/errorHandler";
import { sendPasswordResetEmail } from "../services/email";

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user with email/password, return tokens.
 */
router.post(
  "/register",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues
          .map((e: { message: string }) => e.message)
          .join(", ");
        throw new AppError(message, 400);
      }

      const { email, name, password } = parsed.data;

      // Check if email already taken
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        throw new AppError("Email already registered", 409);
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Insert user
      const [user] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          name,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, name: users.name });

      // Generate tokens
      const accessToken = signAccessToken(user.id);
      const rawRefreshToken = signRefreshToken(user.id);

      // Store hashed refresh token
      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Set refresh token as HttpOnly cookie
      res.cookie("refreshToken", rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(201).json({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/login
 * Authenticate with email/password, return tokens.
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError("Invalid credentials", 401);
      }

      const { email, password } = parsed.data;

      // Find user by email, exclude soft-deleted users
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          passwordHash: users.passwordHash,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      // No user found or OAuth-only account (no password)
      if (!user || !user.passwordHash) {
        throw new AppError("Invalid credentials", 401);
      }

      // Soft-deleted user
      if (user.deletedAt) {
        throw new AppError("Invalid credentials", 401);
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        throw new AppError("Invalid credentials", 401);
      }

      // Generate tokens
      const accessToken = signAccessToken(user.id);
      const rawRefreshToken = signRefreshToken(user.id);

      // Store hashed refresh token (delete old tokens for this user first)
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id));

      const tokenHash = await bcrypt.hash(rawRefreshToken, 10);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // Set refresh token as HttpOnly cookie
      res.cookie("refreshToken", rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({
        user: { id: user.id, email: user.email, name: user.name },
        accessToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/refresh
 * Rotate refresh token and issue new access token.
 */
router.post(
  "/refresh",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken = req.cookies?.refreshToken;
      if (!rawToken) {
        throw new AppError("Missing refresh token", 401);
      }

      // Verify JWT signature and expiry
      let payload;
      try {
        payload = verifyRefreshToken(rawToken);
      } catch {
        throw new AppError("Invalid refresh token", 401);
      }

      const userId = payload.sub;

      // Check user exists and is not deleted
      const [user] = await db
        .select({ id: users.id, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || user.deletedAt) {
        throw new AppError("Invalid refresh token", 401);
      }

      // Find non-expired tokens for this user
      const storedTokens = await db
        .select()
        .from(refreshTokens)
        .where(
          and(
            eq(refreshTokens.userId, userId),
            gt(refreshTokens.expiresAt, new Date()),
          ),
        );

      // Find matching token by comparing hashes
      let matchedTokenId: string | null = null;
      for (const stored of storedTokens) {
        const isMatch = await bcrypt.compare(rawToken, stored.tokenHash);
        if (isMatch) {
          matchedTokenId = stored.id;
          break;
        }
      }

      if (!matchedTokenId) {
        throw new AppError("Invalid refresh token", 401);
      }

      // Delete the used token (rotation)
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.id, matchedTokenId));

      // Issue new tokens
      const newAccessToken = signAccessToken(userId);
      const newRawRefreshToken = signRefreshToken(userId);

      // Store new hashed refresh token
      const newTokenHash = await bcrypt.hash(newRawRefreshToken, 10);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.insert(refreshTokens).values({
        userId,
        tokenHash: newTokenHash,
        expiresAt,
      });

      // Set new refresh cookie
      res.cookie("refreshToken", newRawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: "/",
      });

      res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/logout
 * Invalidate refresh token and clear cookie.
 */
router.post(
  "/logout",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rawToken = req.cookies?.refreshToken;

      if (rawToken) {
        // Try to verify and find matching token to delete
        try {
          const payload = verifyRefreshToken(rawToken);
          const userId = payload.sub;

          // Find non-expired tokens for this user
          const storedTokens = await db
            .select()
            .from(refreshTokens)
            .where(eq(refreshTokens.userId, userId));

          // Find and delete matching token
          for (const stored of storedTokens) {
            const isMatch = await bcrypt.compare(rawToken, stored.tokenHash);
            if (isMatch) {
              await db
                .delete(refreshTokens)
                .where(eq(refreshTokens.id, stored.id));
              break;
            }
          }
        } catch {
          // Token invalid/expired — just clear the cookie
        }
      }

      // Always clear cookie and return 200
      res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      res.status(200).json({ message: "Logged out" });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/forgot-password
 * Generate a password reset token and send email. Always returns 200.
 */
router.post(
  "/forgot-password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        // Still return 200 to prevent enumeration
        res
          .status(200)
          .json({ message: "If that email exists, a reset link has been sent." });
        return;
      }

      const { email } = parsed.data;

      // Look up user by email, exclude soft-deleted
      const [user] = await db
        .select({ id: users.id, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (user && !user.deletedAt) {
        // Generate cryptographically secure reset token
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = await bcrypt.hash(rawToken, 10);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store hashed token
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        // Send reset email (fire-and-forget, don't leak errors)
        try {
          await sendPasswordResetEmail(email.toLowerCase(), rawToken);
        } catch (emailErr) {
          console.error("Failed to send password reset email:", emailErr);
        }
      }

      // Always return 200 regardless of whether email exists
      res
        .status(200)
        .json({ message: "If that email exists, a reset link has been sent." });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
