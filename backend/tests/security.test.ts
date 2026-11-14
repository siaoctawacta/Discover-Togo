import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';
import { as, makeApp, validListing } from './helpers.js';

describe('configuration hardening (fail closed)', () => {
  const prod = { NODE_ENV: 'production', DATA_DRIVER: 'mongo', MONGODB_URI: 'mongodb://x', AUTH_MODE: 'firebase', FIREBASE_PROJECT_ID: 'p', CORS_ORIGINS: 'https://admin.example.com' };
  it('accepts a sane production config and enables HTTPS enforcement', () => {
    expect(loadEnv(prod).REQUIRE_HTTPS).toBe(true);
  });
  it.each([
    ['AUTH_MODE', 'dev'],
    ['DATA_DRIVER', 'memory'],
    ['RATE_LIMIT_ENABLED', 'false'],
    ['CORS_ORIGINS', '*'],
    ['CORS_ORIGINS', 'http://admin.example.com'],
  ])('refuses production with %s=%s', (k, v) => {
    expect(() => loadEnv({ ...prod, [k]: v })).toThrow(/Invalid environment/);
  });
});

describe('HTTP hardening', () => {
  it('sets security headers and hides the stack', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/health').expect(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toContain("default-src 'none'");
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets HSTS and rejects plain HTTP in production mode', async () => {
    const { api } = makeApp({ NODE_ENV: 'production', DATA_DRIVER: 'mongo', MONGODB_URI: 'mongodb://x', AUTH_MODE: 'firebase', FIREBASE_PROJECT_ID: 'p', CORS_ORIGINS: 'https://a.example.com', RATE_LIMIT_ENABLED: 'true', TRUST_PROXY: '1' });
    const http = await api.get('/api/v1/meta').expect(400);
    expect(http.body.error.code).toBe('HTTPS_REQUIRED');
    const https = await api.get('/api/v1/meta').set('X-Forwarded-Proto', 'https').expect(200);
    expect(https.headers['strict-transport-security']).toContain('max-age=63072000');
  });

  it('only reflects allow-listed CORS origins', async () => {
    const { api } = makeApp({ CORS_ORIGINS: 'https://admin.example.com' });
    const ok = await api.get('/api/v1/health').set('Origin', 'https://admin.example.com');
    expect(ok.headers['access-control-allow-origin']).toBe('https://admin.example.com');
    const evil = await api.get('/api/v1/health').set('Origin', 'https://evil.example.com');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    expect(ok.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('never leaks internals in error responses', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/nope').expect(404);
    expect(Object.keys(res.body.error).sort()).toEqual(['code', 'message', 'requestId']);
  });

  it('does not trust a forged X-Request-Id', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/health').set('X-Request-Id', '<script>');
    expect(res.headers['x-request-id']).not.toBe('<script>');
  });
});

describe('input firewall', () => {
  it.each([
    ['operator key', { $where: 'sleep(1000)' }],
    ['nested operator', { preferences: { language: { $ne: 'en' } } }],
    ['dotted key', { 'preferences.language': 'fr' }],
    ['constructor pollution', { constructor: { prototype: { admin: true } } }],
  ])('rejects %s in JSON body', async (_name, body) => {
    const { api } = makeApp();
    const res = await api.patch('/api/v1/me').set(as('x')).send(body).expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects __proto__ in raw JSON', async () => {
    const { api } = makeApp();
    await api.patch('/api/v1/me').set(as('x')).set('Content-Type', 'application/json').send('{"__proto__":{"role":"admin"}}').expect(400);
  });

  it('rejects deeply nested payloads', async () => {
    const { api } = makeApp();
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 20; i++) deep = { a: deep };
    await api.patch('/api/v1/me').set(as('x')).send(deep).expect(400);
  });

  it('rejects query operator / bracket injection and parameter pollution', async () => {
    const { api } = makeApp();
    await api.get('/api/v1/places?city[$ne]=x').expect(400);
    await api.get('/api/v1/places?region=kara&region=plateaux').expect(400);
    await api.get('/api/v1/places?unknown=1').expect(400);
  });

  it('treats regex metacharacters in search literally (no ReDoS)', async () => {
    const { api } = makeApp();
    const res = await api.get(`/api/v1/search?q=${encodeURIComponent('(a+)+$.*')}`).expect(200);
    expect(res.body.total).toBe(0);
  });

  it('enforces JSON content type, body size and well-formed JSON', async () => {
    const { api } = makeApp();
    await api.patch('/api/v1/me').set(as('x')).set('Content-Type', 'application/x-www-form-urlencoded').send('displayName=x').expect(415);
    await api.patch('/api/v1/me').set(as('x')).send({ displayName: 'x'.repeat(30_000) }).expect(413);
    await api.patch('/api/v1/me').set(as('x')).set('Content-Type', 'application/json').send('{bad').expect(400);
  });

  it('validates ids before touching the database', async () => {
    const { api } = makeApp();
    await api.put('/api/v1/me/favorites/not-an-id').set(as('x')).expect(400);
    await api.get('/api/v1/places/..%2F..%2Fetc').expect(400);
  });
});

describe('authentication & authorization', () => {
  it('requires a valid bearer token', async () => {
    const { api } = makeApp();
    await api.get('/api/v1/me').expect(401);
    await api.get('/api/v1/me').set('Authorization', 'Basic abc').expect(401);
    await api.get('/api/v1/me').set('Authorization', 'Bearer dev:x:superadmin').expect(401);
    await api.get('/api/v1/me').set('Authorization', `Bearer ${'a'.repeat(5000)}`).expect(401);
  });

  it('enforces the role hierarchy', async () => {
    const { api } = makeApp();
    const { body } = await api.get('/api/v1/places/mount-agou');
    await api.get('/api/v1/admin/stats').set(as('u')).expect(403);
    await api.get('/api/v1/admin/stats').set(as('e', 'editor')).expect(200);
    await api.get('/api/v1/admin/users').set(as('e', 'editor')).expect(403);
    await api.get('/api/v1/admin/audit-logs').set(as('e', 'editor')).expect(403);
    await api.delete(`/api/v1/admin/listings/${body.id}`).set(as('e', 'editor')).expect(403);
    await api.delete(`/api/v1/admin/listings/${body.id}`).set(as('a', 'admin')).expect(204);
  });

  it('prevents mass assignment of privileged fields', async () => {
    const { api } = makeApp();
    await api.patch('/api/v1/me').set(as('m')).send({ role: 'admin' }).expect(400);
    await api.patch('/api/v1/me').set(as('m')).send({ status: 'active', email: 'x@y.z' }).expect(400);
    await api.post('/api/v1/admin/listings').set(as('e', 'editor')).send(validListing({ rating: 5, views: 1e6 })).expect(400);
    expect((await api.get('/api/v1/me').set(as('m'))).body.role).toBe('user');
  });

  it('suspended users are locked out; admins cannot change their own role or status', async () => {
    const { api } = makeApp();
    const victim = (await api.get('/api/v1/me').set(as('v'))).body;
    const admin = (await api.get('/api/v1/me').set(as('root', 'admin'))).body;
    await api.patch(`/api/v1/admin/users/${victim.id}`).set(as('root', 'admin')).send({ status: 'suspended' }).expect(200);
    const res = await api.get('/api/v1/me').set(as('v')).expect(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
    await api.put('/api/v1/me/favorites/' + 'a'.repeat(24)).set(as('v')).expect(403);
    await api.patch(`/api/v1/admin/users/${admin.id}`).set(as('root', 'admin')).send({ role: 'user' }).expect(403);
    await api.patch(`/api/v1/admin/users/${admin.id}`).set(as('root', 'admin')).send({ status: 'suspended' }).expect(403);
    const logs = await api.get('/api/v1/admin/audit-logs').set(as('root', 'admin')).expect(200);
    expect(logs.body.data[0]).toMatchObject({ action: 'user.update', targetId: victim.id, actorEmail: 'root@dev.local' });
  });

  it('only allow-listed https image hosts are accepted', async () => {
    const { api } = makeApp();
    const bad = (url: string) => validListing({ slug: `img-${Math.random().toString(36).slice(2, 8)}`, images: [{ url }] });
    await api.post('/api/v1/admin/listings').set(as('e', 'editor')).send(bad('http://images.unsplash.com/x')).expect(400);
    await api.post('/api/v1/admin/listings').set(as('e', 'editor')).send(bad('https://evil.example.com/x.png')).expect(400);
    await api.post('/api/v1/admin/listings').set(as('e', 'editor')).send(bad('javascript:alert(1)')).expect(400);
    await api.post('/api/v1/admin/listings').set(as('e', 'editor')).send(validListing({ contact: { website: 'javascript:alert(1)' } })).expect(400);
  });

  it('review spam controls: link limit and per-user rate limit', async () => {
    const { api } = makeApp({ RATE_LIMIT_ENABLED: 'true' });
    const { body: places } = await api.get('/api/v1/places?limit=20');
    const spam = await api
      .post(`/api/v1/listings/${places.data[0].id}/reviews`)
      .set(as('spammer'))
      .send({ rating: 5, comment: 'buy http://a.example http://b.example http://c.example' });
    expect(spam.status).toBe(400);
    const statuses: number[] = [];
    for (let i = 1; i < 12; i++) {
      const r = await api
        .post(`/api/v1/listings/${places.data[i].id}/reviews`)
        .set(as('spammer'))
        .send({ rating: 4, comment: 'Genuinely nice place to visit' });
      statuses.push(r.status);
    }
    expect(statuses).toContain(429);
  });
});
