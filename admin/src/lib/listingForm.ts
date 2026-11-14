import { z } from 'zod';
import {
  AMENITIES, CUISINES, HOTEL_TYPES, LISTING_STATUSES, PLACE_CATEGORIES, REGION_IDS,
  type AdminListing, type Amenity, type Cuisine, type HotelType, type Kind, type ListingInput,
  type ListingStatus, type PlaceCategory, type RegionId,
} from './types';
import { isAllowedImageUrl, isHttpsUrl } from './url';

/*
 * Client-side validation mirroring backend/src/services/schemas.ts (ListingInputSchema).
 * The server remains the source of truth; this gives instant feedback.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CITY_RE = /^[\p{L}' -]+$/u;
const TAG_RE = /^[\p{L}\p{N} -]+$/u;
const PHONE_RE = /^\+?[0-9 ()-]{6,20}$/;
const XOF_MAX = 100_000_000;
// Bounding box of Togo (with margin), same as the API.
export const TOGO_BOUNDS = { latMin: 5.9, latMax: 11.2, lngMin: -0.3, lngMax: 1.9 };

const req = (min: number, max: number, label = 'This field') =>
  z.string().trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);
const opt = (min: number, max: number) =>
  z.string().trim().max(max, `At most ${max} characters`)
    .refine((v) => v === '' || v.length >= min, `At least ${min} characters`);
const optHttps = z.string().trim().max(500, 'At most 500 characters')
  .refine((v) => v === '' || isHttpsUrl(v), 'Must be an https:// URL');
const oneOf = <T extends readonly string[]>(values: T, msg = 'Select a value') =>
  z.string().refine((v) => (values as readonly string[]).includes(v), msg);
const optOneOf = <T extends readonly string[]>(values: T) =>
  z.string().refine((v) => v === '' || (values as readonly string[]).includes(v), 'Invalid value');
const xof = (label: string) =>
  z.number({ error: `${label} must be a number` }).int(`${label} must be a whole number`)
    .min(0, `${label} cannot be negative`).max(XOF_MAX, `${label} is too large`);
/** Numbers that may be empty (NaN from valueAsNumber) until a kind-specific rule requires them. */
const maybeNumber = z.number().or(z.nan());

export const listingFormSchema = z
  .object({
    kind: z.enum(['place', 'restaurant', 'hotel']),
    slug: z.string().trim().min(2, 'Slug must be at least 2 characters').max(80)
      .regex(SLUG_RE, 'Lowercase letters, digits and single hyphens (e.g. lake-togo)'),
    name: z.object({ en: req(2, 120, 'English name'), fr: req(2, 120, 'French name') }),
    description: z.object({ en: req(20, 5000, 'English description'), fr: req(20, 5000, 'French description') }),
    region: oneOf(REGION_IDS, 'Select a region'),
    city: req(2, 60, 'City').regex(CITY_RE, 'Invalid city name'),
    address: opt(2, 200),
    lat: z.number({ error: 'Latitude is required' })
      .min(TOGO_BOUNDS.latMin, `Must be within Togo (${TOGO_BOUNDS.latMin}–${TOGO_BOUNDS.latMax})`)
      .max(TOGO_BOUNDS.latMax, `Must be within Togo (${TOGO_BOUNDS.latMin}–${TOGO_BOUNDS.latMax})`),
    lng: z.number({ error: 'Longitude is required' })
      .min(TOGO_BOUNDS.lngMin, `Must be within Togo (${TOGO_BOUNDS.lngMin}–${TOGO_BOUNDS.lngMax})`)
      .max(TOGO_BOUNDS.lngMax, `Must be within Togo (${TOGO_BOUNDS.lngMin}–${TOGO_BOUNDS.lngMax})`),
    images: z
      .array(
        z.object({
          url: z.string().trim().max(500, 'At most 500 characters')
            .refine(isHttpsUrl, 'Must be an https:// URL')
            .refine((v) => !isHttpsUrl(v) || isAllowedImageUrl(v), 'Image host is not on the allow-list'),
          alt: opt(1, 140),
        }),
      )
      .min(1, 'Add at least one image (the first one is the cover)')
      .max(15, 'At most 15 images'),
    tags: z.array(z.string().trim().min(1).max(30, 'Tags are at most 30 characters').regex(TAG_RE, 'Letters, digits, spaces and hyphens only'))
      .max(15, 'At most 15 tags'),
    featured: z.boolean(),
    status: oneOf(LISTING_STATUSES),
    sponsoredUntil: z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Invalid date'),
    contact: z.object({
      phone: z.string().trim().refine((v) => v === '' || PHONE_RE.test(v), 'Invalid phone (e.g. +228 90 00 00 00)'),
      email: z.string().trim().max(254).refine((v) => v === '' || z.email().safeParse(v).success, 'Invalid email'),
      website: optHttps,
      bookingUrl: optHttps,
    }),
    // place
    category: optOneOf(PLACE_CATEGORIES),
    openingHours: z.object({ en: opt(1, 200), fr: opt(1, 200) }),
    entryFree: z.boolean(),
    entryFeeAmount: maybeNumber,
    entryFeeNote: opt(1, 140),
    // restaurant
    cuisine: optOneOf(CUISINES),
    priceLevel: optOneOf(['1', '2', '3', '4'] as const),
    menu: z.array(
      z.object({
        name: req(1, 80, 'Item name'),
        price: xof('Price'),
        description: opt(1, 200),
      }),
    ).max(100, 'At most 100 menu items'),
    // hotel
    hotelType: optOneOf(HOTEL_TYPES),
    stars: optOneOf(['1', '2', '3', '4', '5'] as const),
    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
    priceMin: maybeNumber,
    priceMax: maybeNumber,
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const checkXof = (path: string, n: number, label: string) => {
      const r = xof(label).safeParse(n);
      if (!r.success) issue([path], Number.isNaN(n) ? `${label} is required` : (r.error.issues[0]?.message ?? 'Invalid'));
    };
    if (v.kind === 'place') {
      if (!v.category) issue(['category'], 'Category is required for places');
      const { en, fr } = v.openingHours ?? { en: '', fr: '' };
      if (Boolean(en) !== Boolean(fr)) issue([en ? 'openingHours.fr' : 'openingHours.en'], 'Provide opening hours in both languages (or neither)');
      if (!v.entryFree) checkXof('entryFeeAmount', v.entryFeeAmount, 'Entry fee');
    }
    if (v.kind === 'restaurant') {
      if (!v.cuisine) issue(['cuisine'], 'Cuisine is required for restaurants');
      if (!v.priceLevel) issue(['priceLevel'], 'Price level is required for restaurants');
    }
    if (v.kind === 'hotel') {
      if (!v.hotelType) issue(['hotelType'], 'Hotel type is required');
      checkXof('priceMin', v.priceMin, 'Minimum price');
      checkXof('priceMax', v.priceMax, 'Maximum price');
      if (Number.isFinite(v.priceMin) && Number.isFinite(v.priceMax) && v.priceMin > v.priceMax) {
        issue(['priceMax'], 'Maximum must be ≥ minimum');
      }
    }
  }, {
    // Run kind-specific rules even when other fields are invalid, so every error shows at once.
    when: (payload) => typeof payload.value === 'object' && payload.value !== null,
  });

export type ListingFormValues = z.input<typeof listingFormSchema>;

export function emptyForm(kind: Kind): ListingFormValues {
  return {
    kind,
    slug: '',
    name: { en: '', fr: '' },
    description: { en: '', fr: '' },
    region: '',
    city: '',
    address: '',
    lat: Number.NaN,
    lng: Number.NaN,
    images: [{ url: '', alt: '' }],
    tags: [],
    featured: false,
    status: 'draft',
    sponsoredUntil: '',
    contact: { phone: '', email: '', website: '', bookingUrl: '' },
    category: '',
    openingHours: { en: '', fr: '' },
    entryFree: true,
    entryFeeAmount: Number.NaN,
    entryFeeNote: '',
    cuisine: '',
    priceLevel: '',
    menu: [],
    hotelType: '',
    stars: '',
    amenities: [],
    priceMin: Number.NaN,
    priceMax: Number.NaN,
  };
}

export function toFormValues(l: AdminListing): ListingFormValues {
  const base = emptyForm(l.kind);
  return {
    ...base,
    slug: l.slug,
    name: { ...l.name },
    description: { ...l.description },
    region: l.region,
    city: l.city,
    address: l.address ?? '',
    lat: l.location.lat,
    lng: l.location.lng,
    images: l.images.length ? l.images.map((i) => ({ url: i.url, alt: i.alt ?? '' })) : base.images,
    tags: [...l.tags],
    featured: l.featured,
    status: l.status,
    sponsoredUntil: l.sponsoredUntil ? l.sponsoredUntil.slice(0, 10) : '',
    contact: {
      phone: l.contact?.phone ?? '',
      email: l.contact?.email ?? '',
      website: l.contact?.website ?? '',
      bookingUrl: l.contact?.bookingUrl ?? '',
    },
    category: l.category ?? '',
    openingHours: { en: l.openingHours?.en ?? '', fr: l.openingHours?.fr ?? '' },
    entryFree: !l.entryFee,
    entryFeeAmount: l.entryFee?.amount ?? Number.NaN,
    entryFeeNote: l.entryFee?.note ?? '',
    cuisine: l.cuisine ?? '',
    priceLevel: l.priceLevel ? String(l.priceLevel) : '',
    menu: (l.menu ?? []).map((m) => ({ name: m.name, price: m.price, description: m.description ?? '' })),
    hotelType: l.hotelType ?? '',
    stars: l.stars ? String(l.stars) : '',
    amenities: [...(l.amenities ?? [])],
    priceMin: l.priceRange?.min ?? Number.NaN,
    priceMax: l.priceRange?.max ?? Number.NaN,
  };
}

const nonEmpty = (s: string): string | undefined => (s.trim() === '' ? undefined : s.trim());

/** Build the API body (POST /admin/listings) from validated form values. Only fields valid for the kind are sent. */
export function toListingInput(v: ListingFormValues): ListingInput {
  const contactEntries = Object.entries(v.contact)
    .map(([k, val]) => [k, val.trim()] as const)
    .filter(([, val]) => val !== '');
  const body: ListingInput = {
    kind: v.kind,
    slug: v.slug.trim(),
    name: { en: v.name.en.trim(), fr: v.name.fr.trim() },
    description: { en: v.description.en.trim(), fr: v.description.fr.trim() },
    region: v.region as RegionId,
    city: v.city.trim(),
    location: { lat: v.lat, lng: v.lng },
    images: v.images.map((i) => {
      const alt = nonEmpty(i.alt);
      return alt ? { url: i.url.trim(), alt } : { url: i.url.trim() };
    }),
    tags: v.tags.map((t) => t.trim()).filter(Boolean),
    featured: v.featured,
    status: v.status as ListingStatus,
    // Date input is a calendar day; sponsorship runs through the end of that day (UTC).
    sponsoredUntil: v.sponsoredUntil ? new Date(`${v.sponsoredUntil}T23:59:59.000Z`).toISOString() : null,
  };
  const address = nonEmpty(v.address);
  if (address) body.address = address;
  if (contactEntries.length) body.contact = Object.fromEntries(contactEntries);

  if (v.kind === 'place') {
    body.category = v.category as PlaceCategory;
    if (v.openingHours.en.trim() && v.openingHours.fr.trim()) {
      body.openingHours = { en: v.openingHours.en.trim(), fr: v.openingHours.fr.trim() };
    }
    const note = nonEmpty(v.entryFeeNote);
    body.entryFee = v.entryFree ? null : { amount: v.entryFeeAmount, currency: 'XOF', ...(note ? { note } : {}) };
  } else if (v.kind === 'restaurant') {
    body.cuisine = v.cuisine as Cuisine;
    body.priceLevel = Number(v.priceLevel) as 1 | 2 | 3 | 4;
    body.menu = v.menu.map((m) => {
      const description = nonEmpty(m.description);
      return { name: m.name.trim(), price: m.price, currency: 'XOF' as const, ...(description ? { description } : {}) };
    });
  } else {
    body.hotelType = v.hotelType as HotelType;
    if (v.stars) body.stars = Number(v.stars);
    body.amenities = v.amenities as Amenity[];
    body.priceRange = { min: v.priceMin, max: v.priceMax, currency: 'XOF' };
  }
  return body;
}

/** PATCH body: same as create but without `kind` (immutable after creation). */
export function toListingPatch(v: ListingFormValues): Partial<ListingInput> {
  const { kind: _kind, ...rest } = toListingInput(v);
  void _kind;
  // PATCH merges top-level keys, so an omitted key keeps its old value. An empty object clears contact.
  // (address / openingHours / stars cannot be cleared: the API accepts neither null nor "" for them.)
  if (!rest.contact) rest.contact = {};
  return rest;
}

/** Map an API issue path (e.g. "location.lat", "priceRange") onto a form field name. */
export function apiPathToField(path: string): string {
  if (path === 'location.lat') return 'lat';
  if (path === 'location.lng') return 'lng';
  if (path.startsWith('entryFee')) return path.endsWith('note') ? 'entryFeeNote' : 'entryFeeAmount';
  if (path.startsWith('priceRange')) return path.endsWith('max') ? 'priceMax' : 'priceMin';
  if (path === 'name' || path === 'description' || path === 'openingHours') return `${path}.en`;
  return path;
}

export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
