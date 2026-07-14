import rateLimit from "express-rate-limit";

/**
 * Resolve a limiter max from the environment (used by e2e runs, where many
 * logins arrive from one IP), falling back to the production default.
 */
function maxFromEnv(envVar: string, fallback: number): number {
  const value = Number(process.env[envVar]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Strict rate limiter for login — 5 requests per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: maxFromEnv("LOGIN_RATE_LIMIT", 5),
  message: { error: "Too many login attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration — 10 requests per hour per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: maxFromEnv("REGISTER_RATE_LIMIT", 10),
  message: { error: "Too many registration attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for password reset — 3 requests per hour per IP.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Too many password reset requests, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

