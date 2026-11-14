import type { Env } from './config/env.js';
import { createMemoryRepository } from './repo/memory.js';
import type { Repository } from './repo/types.js';
import { buildSeedListings } from './seed/data.js';
import { createDevIdentityProvider, createFirebaseIdentityProvider, type IdentityProvider } from './security/identity.js';

export async function createRepository(env: Env): Promise<Repository> {
  if (env.DATA_DRIVER === 'mongo') {
    const { createMongoRepository } = await import('./repo/mongo/mongoRepo.js');
    return createMongoRepository(env.MONGODB_URI!);
  }
  return createMemoryRepository({ listings: buildSeedListings() });
}

export async function createIdentity(env: Env): Promise<IdentityProvider> {
  return env.AUTH_MODE === 'firebase' ? createFirebaseIdentityProvider(env) : createDevIdentityProvider();
}
