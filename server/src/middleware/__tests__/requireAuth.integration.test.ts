import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { signAccessToken } from '../../utils/jwt';

// Mock DB so tests don't need PostgreSQL
vi.mock('../../db', () => ({
  db: {},
  pool: { query: vi.fn() },
}));

vi.mock('../../config/passport', () => ({
  configurePassport: vi.fn(),
}));

describe('requireAuth integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('public routes (/api/health) work without token', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('public routes (/api/auth/*) are not blocked by auth middleware', async () => {
    // POST /api/auth/register with invalid body returns 400 (validation), not 401 (auth)
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('protected routes return 401 without token', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
  });

  it('protected routes return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
  });

  it('protected routes pass auth with valid token (not 401)', async () => {
    const token = signAccessToken('test-user-id');
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`);
    // Auth middleware passes — response is NOT 401 (route may error without full DB mock)
    expect(res.status).not.toBe(401);
  });
});
