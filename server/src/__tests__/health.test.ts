import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('returns status ok with timestamp', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(new Date(res.body.timestamp).toISOString()).toBe(res.body.timestamp);
  });
});

describe('404 handling', () => {
  it('returns 401 for unknown /api routes (auth middleware catches first)', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Authentication required');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('returns 404 for non-api unknown routes', async () => {
    const res = await request(app).get('/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not found');
    expect(res.headers['content-type']).toMatch(/json/);
  });
});
