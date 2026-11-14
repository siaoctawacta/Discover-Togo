import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { listingsApi, type ListingFilters } from '@/api/listings';
import type { Kind, Listing } from '@/api/types';
import { qk } from '@/lib/queryClient';
import { useOfflineStore } from '@/store/offline';
import { useApiLang } from './useApiLang';

const PAGE_SIZE = 20;

export function useListings(kind: Kind, filters: ListingFilters) {
  const lang = useApiLang();
  return useInfiniteQuery({
    queryKey: qk.listings(kind, lang, filters),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => listingsApi.list(kind, { ...filters, page: pageParam, limit: PAGE_SIZE }, signal),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    select: (data) => ({
      items: dedupe(data.pages.flatMap((p) => p.data)),
      total: data.pages[0]?.total ?? 0,
    }),
  });
}

function dedupe(items: Listing[]): Listing[] {
  const seen = new Set<string>();
  return items.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)));
}

/** Search every cached query for a listing to show instantly (or offline). */
function findCachedListing(qc: ReturnType<typeof useQueryClient>, idOrSlug: string): Listing | undefined {
  const match = (l: Listing) => l.id === idOrSlug || l.slug === idOrSlug;
  const offline = useOfflineStore.getState().items.find((e) => match(e.listing))?.listing;
  if (offline) return offline;
  for (const [, data] of qc.getQueriesData<unknown>({})) {
    const found = scan(data, match);
    if (found) return found;
  }
  return undefined;
}

function scan(data: unknown, match: (l: Listing) => boolean, depth = 0): Listing | undefined {
  if (!data || typeof data !== 'object' || depth > 4) return undefined;
  if (Array.isArray(data)) {
    for (const item of data) {
      const f = isListing(item) ? (match(item) ? item : undefined) : scan(item, match, depth + 1);
      if (f) return f;
    }
    return undefined;
  }
  if (isListing(data)) return match(data) ? data : undefined;
  for (const v of Object.values(data)) {
    const f = scan(v, match, depth + 1);
    if (f) return f;
  }
  return undefined;
}

function isListing(v: unknown): v is Listing {
  return !!v && typeof v === 'object' && 'id' in v && 'kind' in v && 'slug' in v && 'description' in v;
}

/** `idOrSlug` must be validated before calling (the hook is disabled when undefined). */
export function useListing(kind: Kind | undefined, idOrSlug: string | undefined) {
  const lang = useApiLang();
  const qc = useQueryClient();
  const refreshOffline = useOfflineStore((s) => s.refresh);
  const query = useQuery<Listing, Error, Listing, ReturnType<typeof qk.listing>>({
    queryKey: qk.listing(kind ?? 'none', idOrSlug ?? 'none', lang),
    queryFn: ({ signal }) => listingsApi.get(kind as Kind, idOrSlug as string, signal),
    enabled: !!kind && !!idOrSlug,
    // Seed from the offline store / other cached lists so the page renders instantly and still
    // works with no network; `initialDataUpdatedAt: 0` marks it stale so it is refetched when online.
    initialData: () => (idOrSlug ? findCachedListing(qc, idOrSlug) : undefined),
    initialDataUpdatedAt: 0,
  });
  // Keep offline copies up to date whenever fresh data arrives.
  useEffect(() => {
    if (query.data && query.dataUpdatedAt > 0) refreshOffline(query.data);
  }, [query.data, query.dataUpdatedAt, refreshOffline]);
  return query;
}
