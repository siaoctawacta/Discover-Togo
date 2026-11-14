import { pick } from '../domain/catalog.js';
import type { AuditRecord, GeoPoint, Lang, ListingRecord, ReviewRecord, UserRecord } from '../domain/types.js';
import { haversineKm } from '../lib/util.js';

/**
 * Presenters are explicit allow-lists of output fields: internal fields
 * (firebaseUid, pushTokens, moderation metadata…) can never leak by accident.
 */

const isSponsored = (l: ListingRecord, now = Date.now()) => !!l.sponsoredUntil && new Date(l.sponsoredUntil).getTime() > now;

export function presentListing(l: ListingRecord, lang: Lang, near?: GeoPoint) {
  return {
    id: l.id,
    kind: l.kind,
    slug: l.slug,
    name: pick(l.name, lang),
    description: pick(l.description, lang),
    region: l.region,
    city: l.city,
    ...(l.address ? { address: l.address } : {}),
    location: l.location,
    coverImage: l.images[0]?.url ?? '',
    images: l.images,
    rating: Math.round(l.rating * 10) / 10,
    reviewCount: l.reviewCount,
    tags: l.tags,
    featured: l.featured,
    sponsored: isSponsored(l),
    ...(l.contact ? { contact: l.contact } : {}),
    ...(near ? { distanceKm: Math.round(haversineKm(near, l.location) * 10) / 10 } : {}),
    ...(l.kind === 'place'
      ? {
          category: l.category,
          ...(l.openingHours ? { openingHours: pick(l.openingHours, lang) } : {}),
          entryFee: l.entryFee ?? null,
        }
      : {}),
    ...(l.kind === 'restaurant' ? { cuisine: l.cuisine, priceLevel: l.priceLevel, menu: l.menu ?? [] } : {}),
    ...(l.kind === 'hotel'
      ? { hotelType: l.hotelType, stars: l.stars, amenities: l.amenities ?? [], priceRange: l.priceRange }
      : {}),
    updatedAt: new Date(l.updatedAt).toISOString(),
  };
}
export type PublicListing = ReturnType<typeof presentListing>;

export function presentAdminListing(l: ListingRecord) {
  const { sponsoredUntil, createdAt, updatedAt, ...rest } = l;
  return {
    ...rest,
    coverImage: l.images[0]?.url ?? '',
    sponsored: isSponsored(l),
    sponsoredUntil: sponsoredUntil ? new Date(sponsoredUntil).toISOString() : null,
    createdAt: new Date(createdAt).toISOString(),
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

export function presentMapPin(l: ListingRecord, lang: Lang) {
  return {
    id: l.id,
    kind: l.kind,
    slug: l.slug,
    name: pick(l.name, lang),
    location: l.location,
    rating: Math.round(l.rating * 10) / 10,
    coverImage: l.images[0]?.url ?? '',
    ...(l.category ? { category: l.category } : {}),
    ...(l.cuisine ? { cuisine: l.cuisine } : {}),
    ...(l.hotelType ? { hotelType: l.hotelType } : {}),
  };
}

export function presentMe(u: UserRecord) {
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    ...(u.photoUrl ? { photoUrl: u.photoUrl } : {}),
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    preferences: u.preferences,
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

export function presentReview(r: ReviewRecord, author?: Pick<UserRecord, 'displayName' | 'photoUrl'> | null) {
  return {
    id: r.id,
    listingId: r.listingId,
    rating: r.rating,
    comment: r.comment,
    author: {
      displayName: author?.displayName || 'Traveler',
      ...(author?.photoUrl ? { photoUrl: author.photoUrl } : {}),
    },
    status: r.status,
    createdAt: new Date(r.createdAt).toISOString(),
  };
}

export function presentAudit(a: AuditRecord) {
  return {
    id: a.id,
    actorId: a.actorId,
    actorEmail: a.actorEmail,
    action: a.action,
    targetType: a.targetType,
    targetId: a.targetId,
    ip: a.ip,
    ...(a.meta ? { meta: a.meta } : {}),
    createdAt: new Date(a.createdAt).toISOString(),
  };
}

export const paginated = <T>(data: T[], page: number, limit: number, total: number) => ({
  data,
  page,
  limit,
  total,
  hasMore: page * limit < total,
});
