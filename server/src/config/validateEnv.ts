const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "ENCRYPTION_KEY",
] as const;

/**
 * Fail fast at boot when production is missing required secrets, so a
 * misconfigured deploy never serves traffic with dev fallbacks.
 */
export function validateEnv(): void {
  if (process.env.NODE_ENV !== "production") return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables in production: ${missing.join(", ")}`,
    );
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      "[ENV] RESEND_API_KEY not set — password reset emails will be logged instead of sent",
    );
  }
}
