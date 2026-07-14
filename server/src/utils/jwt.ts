import jwt from 'jsonwebtoken';

/**
 * Resolve a signing secret from the environment. Development falls back
 * to a well-known value; production must provide a real secret.
 */
function resolveSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`);
  }
  return devFallback;
}

const JWT_SECRET = resolveSecret('JWT_SECRET', 'dev-jwt-secret');
const JWT_REFRESH_SECRET = resolveSecret(
  'JWT_REFRESH_SECRET',
  'dev-refresh-secret',
);

interface TokenPayload {
  sub: string;
}

/** Sign a short-lived access token (15 minutes). */
export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '15m' });
}

/** Sign a long-lived refresh token (30 days). */
export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_REFRESH_SECRET, { expiresIn: '30d' });
}

/** Verify and decode an access token. Throws on invalid/expired. */
export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/** Verify and decode a refresh token. Throws on invalid/expired. */
export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
}
