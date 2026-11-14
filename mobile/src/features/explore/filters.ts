import type { ListingFilters } from '@/api/listings';
import type { Kind } from '@/api/types';

export const PRICE_PRESETS = [
  { id: 'lt25', min: undefined, max: 25000 },
  { id: '25to50', min: 25000, max: 50000 },
  { id: '50to100', min: 50000, max: 100000 },
  { id: 'gt100', min: 100000, max: undefined },
] as const;

export const RATING_PRESETS = [3, 4, 4.5] as const;

export const SORTS = ['popular', 'rating', 'newest', 'distance'] as const;

/** Filters that live in the filter sheet (search text + paging handled separately). */
export type SheetFilters = Omit<ListingFilters, 'q' | 'page' | 'limit' | 'lat' | 'lng'>;

export function countActiveFilters(kind: Kind, f: SheetFilters): number {
  const keys: (keyof SheetFilters)[] =
    kind === 'place' ? ['region', 'category'] : kind === 'restaurant' ? ['region', 'city', 'cuisine', 'priceLevel', 'minRating'] : ['region', 'city', 'hotelType', 'minPrice', 'maxPrice', 'minRating'];
  let n = keys.filter((k) => {
    const v = f[k];
    return v !== undefined && !(Array.isArray(v) && v.length === 0);
  }).length;
  if (kind === 'hotel' && f.minPrice !== undefined && f.maxPrice !== undefined) n -= 1;
  return n + (f.sort && f.sort !== 'popular' ? 1 : 0);
}
