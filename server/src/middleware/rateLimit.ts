import rateLimit from "express-rate-limit";

/**
 * Strict rate limiter for login — 5 requests per 15 minutes per IP.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many login attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for registration — 10 requests per hour per IP.
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
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

