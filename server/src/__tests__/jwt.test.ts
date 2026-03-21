import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';

describe('JWT utilities', () => {
  const userId = '550e8400-e29b-41d4-a716-446655440000';

  it('signAccessToken returns a string token', () => {
    const token = signAccessToken(userId);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT format
  });

  it('verifyAccessToken decodes sub from access token', () => {
    const token = signAccessToken(userId);
    const payload = verifyAccessToken(token);
    expect(payload.sub).toBe(userId);
  });

  it('verifyAccessToken throws on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow();
  });

  it('signRefreshToken returns a string token', () => {
    const token = signRefreshToken(userId);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyRefreshToken decodes sub from refresh token', () => {
    const token = signRefreshToken(userId);
    const payload = verifyRefreshToken(token);
    expect(payload.sub).toBe(userId);
  });

  it('verifyRefreshToken throws on access token (wrong secret)', () => {
    const accessToken = signAccessToken(userId);
    expect(() => verifyRefreshToken(accessToken)).toThrow();
  });

  it('verifyAccessToken throws on refresh token (wrong secret)', () => {
    const refreshToken = signRefreshToken(userId);
    expect(() => verifyAccessToken(refreshToken)).toThrow();
  });
});
