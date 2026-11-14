import request from 'supertest';
import { createApp } from '../src/app.js';
import { testEnv } from '../src/config/env.js';
import { createMemoryRepository } from '../src/repo/memory.js';
import { buildSeedListings } from '../src/seed/data.js';
import { createDevIdentityProvider } from '../src/security/identity.js';

export function makeApp(envOverrides: Record<string, string> = {}) {
  const env = testEnv({ RATE_LIMIT_ENABLED: 'false', ...envOverrides });
  const repo = createMemoryRepository({ listings: buildSeedListings() });
  const app = createApp({ env, repo, identity: createDevIdentityProvider() });
  return { app, repo, env, api: request(app) };
}

export const as = (uid: string, role: 'user' | 'editor' | 'admin' = 'user') => ({ Authorization: `Bearer dev:${uid}:${role}` });

export const validListing = (overrides: Record<string, unknown> = {}) => ({
  kind: 'place',
  slug: 'test-place',
  name: { en: 'Test Place', fr: 'Lieu test' },
  description: { en: 'A lovely place to visit in Togo.', fr: 'Un joli lieu à visiter au Togo.' },
  region: 'maritime',
  city: 'Lomé',
  location: { lat: 6.13, lng: 1.22 },
  images: [{ url: 'https://images.unsplash.com/photo-1?w=10' }],
  category: 'beach',
  status: 'published',
  ...overrides,
});
