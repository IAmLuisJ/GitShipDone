import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../db/schema';
import { refreshTokens } from '../db/schema';
import { registerSchema } from '../validators/auth';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user with email/password, return tokens.
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues
          .map((e: { message: string }) => e.message)
          .join(', ');
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
        throw new AppError('Email already registered', 409);
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
      res.cookie('refreshToken', rawRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
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

export default router;
