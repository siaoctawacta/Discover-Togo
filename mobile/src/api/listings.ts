import { apiRequest } from './client';
import { kindToPath, type Cuisine, type HotelType, type Kind, type Listing, type Paginated, type PlaceCategory, type RegionId, type SortOption } from './types';

interface CommonFilters {
  region?: RegionId;
  city?: string;
  q?: string;
  sort?: SortOption;
  lat?: number;
  lng?: number;
  page?: number;
  limit?: number;
}
export interface PlaceFilters extends CommonFilters { category?: PlaceCategory }
export interface RestaurantFilters extends CommonFilters { cuisine?: Cuisine; priceLevel?: number[]; minRating?: number }
export interface HotelFilters extends CommonFilters { hotelType?: HotelType; minPrice?: number; maxPrice?: number; minRating?: number }

export type ListingFilters = PlaceFilters & RestaurantFilters & HotelFilters;

/** Keep only the query keys each endpoint accepts (backend uses strict schemas). */
const ALLOWED: Record<Kind, readonly (keyof ListingFilters)[]> = {
  place: ['region', 'city', 'category', 'q', 'sort', 'lat', 'lng', 'page', 'limit'],
  restaurant: ['region', 'city', 'cuisine', 'priceLevel', 'minRating', 'q', 'sort', 'lat', 'lng', 'page', 'limit'],
  hotel: ['region', 'city', 'hotelType', 'minPrice', 'maxPrice', 'minRating', 'q', 'sort', 'lat', 'lng', 'page', 'limit'],
};

export function pickFilters(kind: Kind, filters: ListingFilters): ListingFilters {
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED[kind]) {
    const v = filters[key];
    if (v !== undefined && !(Array.isArray(v) && v.length === 0)) out[key] = v;
  }
  // `sort=distance` is only meaningful with coordinates.
  if (out.sort === 'distance' && (out.lat === undefined || out.lng === undefined)) delete out.sort;
  return out as ListingFilters;
}

export const listingsApi = {
  list: (kind: Kind, filters: ListingFilters, signal?: AbortSignal) =>
    apiRequest<Paginated<Listing>>(`/${kindToPath[kind]}`, {
      query: pickFilters(kind, filters) as Record<string, string | number | number[] | undefined>,
      lang: true,
      signal,
    }),
  /** idOrSlug MUST be validated by the caller (see lib/validators). */
  get: (kind: Kind, idOrSlug: string, signal?: AbortSignal) =>
    apiRequest<Listing>(`/${kindToPath[kind]}/${encodeURIComponent(idOrSlug)}`, { lang: true, signal }),
};
