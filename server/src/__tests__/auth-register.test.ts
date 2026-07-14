import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Mock rate limiters to pass through — prevents cross-test rate limit interference
vi.mock('../middleware/rateLimit', () => {
  const passthrough = (_req: any, _res: any, next: any) => next();
  return {
    loginLimiter: passthrough,
    registerLimiter: passthrough,
    forgotPasswordLimiter: passthrough,
  };
});

import app from '../app';

// Mock the DB module
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from '../db';

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'not-an-email',
      name: 'Test',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      name: 'Test',
      password: 'short',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      name: '',
      password: 'password123',
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 if email already exists', async () => {
    setupSelectMock([{ id: 'existing-id' }]);

    const res = await request(app).post('/api/auth/register').send({
      email: 'existing@example.com',
      name: 'Test',
      password: 'password123',
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });

  it('returns 201 with user and accessToken on success', async () => {
    const fakeUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'new@example.com',
      name: 'New User',
    };

    // First call: select (check existing) — empty result
    setupSelectMock([]);

    // Insert calls: first for user, second for refresh token
    let insertCallCount = 0;
    const userInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeUser]),
    };
    const tokenInsertChain = {
      values: vi.fn().mockResolvedValue(undefined),
      returning: vi.fn().mockResolvedValue([]),
    };
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) return userInsertChain as any;
      return tokenInsertChain as any;
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'new@example.com',
      name: 'New User',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual(fakeUser);
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');

    // Verify HttpOnly refresh token cookie is set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/httponly/i);
    expect(refreshCookie).toMatch(/samesite=lax/i);
  });

  it('lowercases the email before storage', async () => {
    const fakeUser = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'mixed@example.com',
      name: 'Test',
    };

    const selectChain = setupSelectMock([]);

    let insertCallCount = 0;
    const userInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeUser]),
    };
    const tokenInsertChain = {
      values: vi.fn().mockResolvedValue(undefined),
      returning: vi.fn().mockResolvedValue([]),
    };
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) return userInsertChain as any;
      return tokenInsertChain as any;
    });

    await request(app).post('/api/auth/register').send({
      email: 'Mixed@Example.COM',
      name: 'Test',
      password: 'password123',
    });

    // Verify select was called (email lookup)
    expect(selectChain.from).toHaveBeenCalled();

    // Verify insert was called with lowercased email
    const insertValues = userInsertChain.values.mock.calls[0][0];
    expect(insertValues.email).toBe('mixed@example.com');
  });

  it('hashes the password (not stored in plaintext)', async () => {
    const fakeUser = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      email: 'hash@example.com',
      name: 'Test',
    };

    setupSelectMock([]);

    let insertCallCount = 0;
    const userInsertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([fakeUser]),
    };
    const tokenInsertChain = {
      values: vi.fn().mockResolvedValue(undefined),
      returning: vi.fn().mockResolvedValue([]),
    };
    mockInsert.mockImplementation(() => {
      insertCallCount++;
      if (insertCallCount === 1) return userInsertChain as any;
      return tokenInsertChain as any;
    });

    await request(app).post('/api/auth/register').send({
      email: 'hash@example.com',
      name: 'Test',
      password: 'password123',
    });

    const insertValues = userInsertChain.values.mock.calls[0][0];
    expect(insertValues.passwordHash).toBeDefined();
    expect(insertValues.passwordHash).not.toBe('password123');
    // bcrypt hashes start with $2a$ or $2b$
    expect(insertValues.passwordHash).toMatch(/^\$2[ab]\$/);
  });
});
