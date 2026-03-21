import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../app';

// Mock the DB module
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

import { db } from '../db';

const mockSelect = vi.mocked(db.select);
const mockInsert = vi.mocked(db.insert);
const mockDelete = vi.mocked((db as any).delete);

function setupSelectMock(rows: unknown[]) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  mockSelect.mockReturnValue(chain as any);
  return chain;
}

function setupDeleteMock() {
  const chain = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  mockDelete.mockReturnValue(chain as any);
  return chain;
}

function setupInsertMock() {
  const chain = {
    values: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([]),
  };
  mockInsert.mockReturnValue(chain as any);
  return chain;
}

const VALID_PASSWORD = 'password123';
let hashedPassword: string;

beforeEach(async () => {
  vi.clearAllMocks();
  hashedPassword = await bcrypt.hash(VALID_PASSWORD, 4); // low rounds for speed
});

describe('POST /api/auth/login', () => {
  it('returns 401 for missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for non-existent email (same message as wrong password)', async () => {
    setupSelectMock([]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'unknown@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for wrong password', async () => {
    setupSelectMock([
      {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: hashedPassword,
        deletedAt: null,
      },
    ]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for soft-deleted user', async () => {
    setupSelectMock([
      {
        id: 'user-id',
        email: 'deleted@example.com',
        name: 'Deleted',
        passwordHash: hashedPassword,
        deletedAt: new Date(),
      },
    ]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'deleted@example.com',
      password: VALID_PASSWORD,
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 for OAuth-only user (no password hash)', async () => {
    setupSelectMock([
      {
        id: 'user-id',
        email: 'oauth@example.com',
        name: 'OAuth User',
        passwordHash: null,
        deletedAt: null,
      },
    ]);

    const res = await request(app).post('/api/auth/login').send({
      email: 'oauth@example.com',
      password: 'password123',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 200 with user and accessToken on success', async () => {
    const fakeUser = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'test@example.com',
      name: 'Test User',
      passwordHash: hashedPassword,
      deletedAt: null,
    };

    setupSelectMock([fakeUser]);
    setupDeleteMock();
    setupInsertMock();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: VALID_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({
      id: fakeUser.id,
      email: fakeUser.email,
      name: fakeUser.name,
    });
    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('sets HttpOnly refresh token cookie on success', async () => {
    setupSelectMock([
      {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: hashedPassword,
        deletedAt: null,
      },
    ]);
    setupDeleteMock();
    setupInsertMock();

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: VALID_PASSWORD,
    });

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const refreshCookie = Array.isArray(cookies)
      ? cookies.find((c: string) => c.startsWith('refreshToken='))
      : cookies;
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/httponly/i);
    expect(refreshCookie).toMatch(/samesite=lax/i);
  });

  it('deletes old refresh tokens before storing new one', async () => {
    setupSelectMock([
      {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test',
        passwordHash: hashedPassword,
        deletedAt: null,
      },
    ]);
    const deleteChain = setupDeleteMock();
    setupInsertMock();

    await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: VALID_PASSWORD,
    });

    expect(mockDelete).toHaveBeenCalled();
    expect(deleteChain.where).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
  });
});
