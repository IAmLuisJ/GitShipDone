import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { requireAuth } from '../requireAuth';
import * as jwtUtils from '../../utils/jwt';

vi.mock('../../utils/jwt');

function mockReqResNext(authHeader?: string) {
  const req = {
    headers: { authorization: authHeader },
  } as unknown as Request;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when Authorization header is missing', () => {
    const { req, res, next } = mockReqResNext(undefined);
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is not Bearer', () => {
    const { req, res, next } = mockReqResNext('Basic abc123');
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired or invalid', () => {
    vi.mocked(jwtUtils.verifyAccessToken).mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const { req, res, next } = mockReqResNext('Bearer expired-token');
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches userId and calls next on valid token', () => {
    vi.mocked(jwtUtils.verifyAccessToken).mockReturnValue({
      sub: 'user-123',
    });
    const { req, res, next } = mockReqResNext('Bearer valid-token');
    requireAuth(req, res, next);
    expect(req.userId).toBe('user-123');
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when Bearer token is empty string', () => {
    const { req, res, next } = mockReqResNext('Bearer ');
    vi.mocked(jwtUtils.verifyAccessToken).mockImplementation(() => {
      throw new Error('jwt malformed');
    });
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
