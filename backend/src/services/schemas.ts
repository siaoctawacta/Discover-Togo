import { z } from 'zod';
import type { Env } from '../config/env.js';
import { CITY_TO_REGION } from '../domain/catalog.js';
import {
  AMENITIES, CUISINES, HOTEL_TYPES, KINDS, LANGS, LISTING_STATUSES, PLACE_CATEGORIES,
  REGION_IDS, REVIEW_STATUSES, ROLES,
} from '../domain/types.js';
import { OBJECT_ID_RE, SLUG_RE } from '../lib/util.js';

/* ----------------------------- primitives ----------------------------- */

export const objectId = z.string().regex(OBJECT_ID_RE, 'Invalid id');
export const idOrSlug = z.string().max(80).refine((s) => OBJECT_ID_RE.test(s) || SLUG_RE.test(s), 'Invalid id or slug');
const lang = z.enum(LANGS).optional();
const page = z.coerce.number().int().min(1).max(1000).default(1);
const limit = (max: number, def = 20) => z.coerce.number().int().min(1).max(max).default(def);
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
const search = text(1, 80);
const csvEnum = <T extends readonly [string, ...string[]]>(values: T, maxItems = values.length) =>
  z
    .string()
    .max(200)
    .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.enum(values)).min(1).max(maxItems));
const sort = z.enum(['popular', 'rating', 'newest', 'distance']).optional();

const geoPair = z
  .object({ lat: lat.optional(), lng: lng.optional() })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), 'lat and lng must be provided together');

/* ------------------------------ queries ------------------------------- */

export const LangQuery = z.object({ lang }).strict();

const listBase = {
  lang, page, limit: limit(50), q: search.optional(), sort,
  region: z.enum(REGION_IDS).optional(), city: text(2, 60).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  lat: lat.optional(), lng: lng.optional(),
};
const withGeo = <T extends z.ZodObject>(s: T) =>
  s.strict().superRefine((v: { lat?: number; lng?: number; sort?: string }, ctx) => {
    if ((v.lat === undefined) !== (v.lng === undefined)) ctx.addIssue({ code: 'custom', message: 'lat and lng must be provided together' });
    if (v.sort === 'distance' && v.lat === undefined) ctx.addIssue({ code: 'custom', message: 'sort=distance requires lat and lng' });
  });

export const PlacesQuery = withGeo(z.object({ ...listBase, category: z.enum(PLACE_CATEGORIES).optional() }));
export const RestaurantsQuery = withGeo(
  z.object({ ...listBase, cuisine: z.enum(CUISINES).optional(), priceLevel: csvEnum(['1', '2', '3', '4'] as const).optional() }),
);
export const HotelsQuery = withGeo(
  z.object({
    ...listBase,
    hotelType: z.enum(HOTEL_TYPES).optional(),
    minPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
    maxPrice: z.coerce.number().int().min(0).max(10_000_000).optional(),
  }),
);

export const SearchQuery = z
  .object({ q: text(2, 80), kinds: csvEnum(KINDS).optional(), limit: limit(20, 8), lang })
  .strict();

export const RecommendationsQuery = z
  .object({ lat: lat.optional(), lng: lng.optional(), limit: limit(20, 10), lang })
  .strict()
  .and(geoPair);

export const MapQuery = z
  .object({
    kinds: csvEnum(KINDS).optional(),
    lang,
    bbox: z
      .string()
      .max(120)
      .transform((s) => s.split(',').map(Number))
      .pipe(z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(-90).max(90)]))
      .refine(([a, b, c, d]) => a < c && b < d, 'bbox must be minLng,minLat,maxLng,maxLat')
      .optional(),
  })
  .strict();

export const PageQuery = z.object({ page, limit: limit(50) }).strict();

/* ------------------------------- bodies ------------------------------- */

const preferences = z
  .object({
    language: z.enum(LANGS),
    theme: z.enum(['system', 'light', 'dark']),
    interests: z.array(z.enum(PLACE_CATEGORIES)).max(PLACE_CATEGORIES.length),
    regions: z.array(z.enum(REGION_IDS)).max(REGION_IDS.length),
  })
  .strict()
  .partial();

export const SessionBody = z
  .object({ displayName: text(1, 60).optional(), language: z.enum(LANGS).optional() })
  .strict();

export const PushTokenBody = z
  .object({ token: z.string().regex(/^[A-Za-z0-9_\-:[\].]{20,300}$/, 'Invalid push token'), platform: z.enum(['ios', 'android']) })
  .strict();

export const ReviewBody = z
  .object({ rating: z.number().int().min(1).max(5), comment: text(10, 1000) })
  .strict();

export const ReviewModerationBody = z.object({ status: z.enum(['approved', 'rejected']) }).strict();
export const AdminReviewsQuery = z.object({ status: z.enum(REVIEW_STATUSES).default('pending'), page, limit: limit(50) }).strict();

export const AdminUsersQuery = z
  .object({ q: search.optional(), role: z.enum(ROLES).optional(), status: z.enum(['active', 'suspended']).optional(), page, limit: limit(50) })
  .strict();
export const AdminUserPatch = z
  .object({ role: z.enum(ROLES).optional(), status: z.enum(['active', 'suspended']).optional() })
  .strict()
  .refine((v) => v.role || v.status, 'Nothing to update');

export const AdminListingsQuery = z
  .object({ kind: z.enum(KINDS).optional(), status: z.enum(LISTING_STATUSES).optional(), q: search.optional(), page, limit: limit(50) })
  .strict();

/** Schemas that depend on configuration (image host allow-list). */
export function makeSchemas(env: Env) {
  const httpsUrl = z
    .string()
    .max(500)
    .refine((s) => {
      try {
        return new URL(s).protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Must be an https:// URL');

  const imageUrl = httpsUrl.refine((s) => env.IMAGE_HOSTS.includes(new URL(s).hostname), 'Image host is not allowed');

  const photoUrl = httpsUrl.refine(
    (s) => [...env.IMAGE_HOSTS, 'lh3.googleusercontent.com'].includes(new URL(s).hostname),
    'Photo host is not allowed',
  );

  const MeBody = z
    .object({ displayName: text(1, 60).optional(), photoUrl: photoUrl.optional(), preferences: preferences.optional() })
    .strict();

  const l10n = (max: number, min = 1) => z.object({ en: text(min, max), fr: text(min, max) }).strict();
  const xof = z.number().int().min(0).max(100_000_000);

  const ListingFields = z
    .object({
      kind: z.enum(KINDS),
      slug: z.string().min(2).max(80).regex(SLUG_RE, 'Slug must be lowercase words separated by hyphens'),
      name: l10n(120, 2),
      description: l10n(5000, 20),
      region: z.enum(REGION_IDS),
      city: text(2, 60).regex(/^[\p{L}' -]+$/u, 'Invalid city name'),
      address: text(2, 200).optional(),
      // Bounding box of Togo (with a small margin): catches swapped lat/lng typos.
      location: z.object({ lat: z.number().min(5.9).max(11.2), lng: z.number().min(-0.3).max(1.9) }).strict(),
      images: z.array(z.object({ url: imageUrl, alt: text(1, 140).optional() }).strict()).min(1).max(15),
      tags: z.array(text(1, 30).regex(/^[\p{L}\p{N} -]+$/u)).max(15).default([]),
      featured: z.boolean().default(false),
      sponsoredUntil: z.coerce.date().nullable().default(null),
      status: z.enum(LISTING_STATUSES).default('draft'),
      contact: z
        .object({
          phone: z.string().regex(/^\+?[0-9 ()-]{6,20}$/, 'Invalid phone').optional(),
          email: z.email().max(254).optional(),
          website: httpsUrl.optional(),
          bookingUrl: httpsUrl.optional(),
        })
        .strict()
        .optional(),
      category: z.enum(PLACE_CATEGORIES).optional(),
      openingHours: l10n(200).optional(),
      entryFee: z.object({ amount: xof, currency: z.literal('XOF'), note: text(1, 140).optional() }).strict().nullable().optional(),
      cuisine: z.enum(CUISINES).optional(),
      priceLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
      menu: z
        .array(z.object({ name: text(1, 80), price: xof, currency: z.literal('XOF'), description: text(1, 200).optional() }).strict())
        .max(100)
        .optional(),
      hotelType: z.enum(HOTEL_TYPES).optional(),
      stars: z.number().int().min(1).max(5).optional(),
      amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length).optional(),
      priceRange: z.object({ min: xof, max: xof, currency: z.literal('XOF') }).strict().optional(),
    })
    .strict();

  /** Full validation including cross-field / per-kind invariants. */
  const ListingInputSchema = ListingFields.superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    const knownRegion = CITY_TO_REGION[v.city];
    if (knownRegion && knownRegion !== v.region) issue('city', `${v.city} is in the ${knownRegion} region`);
    const only: Record<string, (keyof typeof v)[]> = {
      place: ['category', 'openingHours', 'entryFee'],
      restaurant: ['cuisine', 'priceLevel', 'menu'],
      hotel: ['hotelType', 'stars', 'amenities', 'priceRange'],
    };
    for (const [kind, fields] of Object.entries(only))
      if (kind !== v.kind) for (const f of fields) if (v[f] !== undefined) issue(f, `Not allowed for kind "${v.kind}"`);
    if (v.kind === 'place' && !v.category) issue('category', 'Required for places');
    if (v.kind === 'restaurant') {
      if (!v.cuisine) issue('cuisine', 'Required for restaurants');
      if (!v.priceLevel) issue('priceLevel', 'Required for restaurants');
    }
    if (v.kind === 'hotel') {
      if (!v.hotelType) issue('hotelType', 'Required for hotels');
      if (!v.priceRange) issue('priceRange', 'Required for hotels');
      else if (v.priceRange.min > v.priceRange.max) issue('priceRange', 'min must be ≤ max');
    }
  });

  const ListingPatchSchema = ListingFields.omit({ kind: true }).partial().strict();

  return { MeBody, ListingInputSchema, ListingPatchSchema };
}
export type Schemas = ReturnType<typeof makeSchemas>;
