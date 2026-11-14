import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, type Query } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { isApiError } from '@/api/errors';

/**
 * Query key roots. PUBLIC roots are persisted to AsyncStorage for offline mode;
 * USER roots are never persisted and are wiped on sign-out.
 */
export const qk = {
  home: (lang: string) => ['home', lang] as const,
  meta: (lang: string) => ['meta', lang] as const,
  listings: (kind: string, lang: string, filters: object) => ['listings', kind, lang, filters] as const,
  listing: (kind: string, idOrSlug: string, lang: string) => ['listing', kind, idOrSlug, lang] as const,
  search: (q: string, lang: string) => ['search', q, lang] as const,
  map: (kinds: string, lang: string) => ['map', kinds, lang] as const,
  reviews: (listingId: string) => ['reviews', listingId] as const,
  recommendations: (lang: string, coords: string, uid: string) => ['user', 'recommendations', uid, lang, coords] as const,
  me: (uid: string) => ['user', 'me', uid] as const,
  favorites: (uid: string, lang: string) => ['user', 'favorites', uid, lang] as const,
  recent: (uid: string, lang: string) => ['user', 'recent', uid, lang] as const,
};

const PERSISTED_ROOTS = new Set(['home', 'meta', 'listings', 'listing', 'map', 'reviews']);
export const USER_ROOT = 'user';

export function shouldPersistQuery(query: Query): boolean {
  const root = query.queryKey[0];
  return typeof root === 'string' && PERSISTED_ROOTS.has(root) && query.state.status === 'success';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 7 * 24 * 60 * 60 * 1000, // >= persister maxAge so offline cache survives
      retry: (count, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500 && error.status !== 429) return false;
        return count < 2;
      },
      networkMode: 'offlineFirst',
      refetchOnWindowFocus: false,
    },
    mutations: { networkMode: 'online', retry: false },
  },
});

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'dt.query-cache.v1',
  throttleTime: 2000,
});

export const PERSIST_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Remove every user-specific cache entry (favorites, recent, me, personalized recs). */
export function clearUserCaches(): void {
  queryClient.removeQueries({ queryKey: [USER_ROOT] });
}
