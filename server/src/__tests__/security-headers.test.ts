import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Helmet security headers', () => {
  it('sets X-Content-Type-Options: nosniff', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('sets X-Frame-Options header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });

  it('sets Content-Security-Policy header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('sets Strict-Transport-Security header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('sets X-DNS-Prefetch-Control header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
  });
});

describe('CORS configuration', () => {
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:5173';

  it('returns CORS headers for allowed origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not set wildcard origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil.com');

    // Static CORS origin always sets the configured origin (browser enforces matching)
    // The important security property is it's never '*'
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
  });

  it('handles OPTIONS preflight with correct headers', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', allowedOrigin)
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-methods']).toContain('PATCH');
    expect(res.headers['access-control-allow-methods']).toContain('DELETE');
    expect(res.headers['access-control-allow-headers']).toMatch(/content-type/i);
    expect(res.headers['access-control-allow-headers']).toMatch(/authorization/i);
  });

  it('preflight never returns wildcard origin', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://evil.com')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});
