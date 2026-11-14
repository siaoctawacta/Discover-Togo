import type { AuditRecord, ListingRecord, ReviewRecord, UserRecord } from '../domain/types.js';
import { fold, haversineKm, newId } from '../lib/util.js';
import type { ListingQuery, Page, Repository } from './types.js';

const clone = <T>(v: T): T => structuredClone(v);

function paginate<T>(arr: T[], page = 1, limit = 20): Page<T> {
  const start = (page - 1) * limit;
  return { items: arr.slice(start, start + limit).map(clone), total: arr.length };
}

export function matchesListing(l: ListingRecord, q: ListingQuery): boolean {
  const status = q.status ?? 'published';
  if (status !== 'any' && l.status !== status) return false;
  if (q.kind && l.kind !== q.kind) return false;
  if (q.kinds && !q.kinds.includes(l.kind)) return false;
  if (q.region && l.region !== q.region) return false;
  if (q.city && fold(l.city) !== fold(q.city)) return false;
  if (q.category && l.category !== q.category) return false;
  if (q.categories && (!l.category || !q.categories.includes(l.category))) return false;
  if (q.cuisine && l.cuisine !== q.cuisine) return false;
  if (q.priceLevels && (!l.priceLevel || !q.priceLevels.includes(l.priceLevel))) return false;
  if (q.hotelType && l.hotelType !== q.hotelType) return false;
  if (q.minPrice !== undefined && (!l.priceRange || l.priceRange.max < q.minPrice)) return false;
  if (q.maxPrice !== undefined && (!l.priceRange || l.priceRange.min > q.maxPrice)) return false;
  if (q.minRating !== undefined && l.rating < q.minRating) return false;
  if (q.featured !== undefined && l.featured !== q.featured) return false;
  if (q.ids && !q.ids.includes(l.id)) return false;
  if (q.excludeIds && q.excludeIds.includes(l.id)) return false;
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = q.bbox;
    const { lat, lng } = l.location;
    if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) return false;
  }
  if (q.q) {
    const needle = fold(q.q);
    const hay = fold([l.name.en, l.name.fr, l.city, ...l.tags].join(' '));
    if (!hay.includes(needle)) return false;
  }
  return true;
}

export function sortListings(arr: ListingRecord[], q: ListingQuery): ListingRecord[] {
  const sort = q.sort ?? 'popular';
  const near = q.near;
  const cmp: Record<string, (a: ListingRecord, b: ListingRecord) => number> = {
    popular: (a, b) => b.views - a.views || b.rating - a.rating,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    distance: near
      ? (a, b) => haversineKm(near, a.location) - haversineKm(near, b.location)
      : (a, b) => b.views - a.views,
  };
  return [...arr].sort((a, b) => cmp[sort]!(a, b) || a.slug.localeCompare(b.slug));
}

export function createMemoryRepository(seed: { listings?: ListingRecord[] } = {}): Repository {
  const listings = new Map<string, ListingRecord>((seed.listings ?? []).map((l) => [l.id, clone(l)]));
  const users = new Map<string, UserRecord>();
  const reviews = new Map<string, ReviewRecord>();
  const audit: AuditRecord[] = [];

  return {
    listings: {
      async find(q) {
        const hits = sortListings([...listings.values()].filter((l) => matchesListing(l, q)), q);
        return paginate(hits, q.page, q.limit ?? 20);
      },
      async findById(id) {
        const l = listings.get(id);
        return l ? clone(l) : null;
      },
      async findBySlug(slug) {
        for (const l of listings.values()) if (l.slug === slug) return clone(l);
        return null;
      },
      async create(input) {
        if ([...listings.values()].some((l) => l.slug === input.slug))
          throw Object.assign(new Error('duplicate slug'), { code: 11000 });
        const now = new Date();
        const rec: ListingRecord = { ...clone(input), id: newId(), rating: 0, reviewCount: 0, views: 0, createdAt: now, updatedAt: now };
        listings.set(rec.id, rec);
        return clone(rec);
      },
      async update(id, patch) {
        const cur = listings.get(id);
        if (!cur) return null;
        if (patch.slug && [...listings.values()].some((l) => l.slug === patch.slug && l.id !== id))
          throw Object.assign(new Error('duplicate slug'), { code: 11000 });
        const next = { ...cur, ...clone(patch), updatedAt: new Date() };
        listings.set(id, next);
        return clone(next);
      },
      async delete(id) {
        return listings.delete(id);
      },
      async incrementViews(id) {
        const l = listings.get(id);
        if (l) l.views += 1;
      },
      async setRating(id, rating, reviewCount) {
        const l = listings.get(id);
        if (l) Object.assign(l, { rating, reviewCount });
      },
      async countBy(field, filter = {}) {
        const out: Record<string, number> = {};
        for (const l of listings.values()) {
          if (filter.status && l.status !== filter.status) continue;
          if (filter.kind && l.kind !== filter.kind) continue;
          const key = l[field];
          if (key) out[key] = (out[key] ?? 0) + 1;
        }
        return out;
      },
    },
    users: {
      async findById(id) {
        const u = users.get(id);
        return u ? clone(u) : null;
      },
      async findByFirebaseUid(uid) {
        for (const u of users.values()) if (u.firebaseUid === uid) return clone(u);
        return null;
      },
      async create(u) {
        const now = new Date();
        const rec: UserRecord = { ...clone(u), id: newId(), createdAt: now, updatedAt: now };
        users.set(rec.id, rec);
        return clone(rec);
      },
      async update(id, patch) {
        const cur = users.get(id);
        if (!cur) return null;
        const next = { ...cur, ...clone(patch), updatedAt: new Date() };
        users.set(id, next);
        return clone(next);
      },
      async delete(id) {
        return users.delete(id);
      },
      async list(q) {
        const needle = q.q ? fold(q.q) : undefined;
        const hits = [...users.values()]
          .filter((u) => (!q.role || u.role === q.role) && (!q.status || u.status === q.status))
          .filter((u) => !needle || fold(`${u.email} ${u.displayName}`).includes(needle))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return paginate(hits, q.page, q.limit);
      },
      async count(filter = {}) {
        return [...users.values()].filter(
          (u) => (!filter.role || u.role === filter.role) && (!filter.status || u.status === filter.status),
        ).length;
      },
      async addFavorite(id, listingId) {
        const u = users.get(id);
        if (u && !u.favorites.includes(listingId)) u.favorites.unshift(listingId);
      },
      async removeFavorite(id, listingId) {
        const u = users.get(id);
        if (u) u.favorites = u.favorites.filter((f) => f !== listingId);
      },
      async pushRecent(id, listingId, max) {
        const u = users.get(id);
        if (!u) return;
        u.recent = [{ listingId, at: new Date() }, ...u.recent.filter((r) => r.listingId !== listingId)].slice(0, max);
      },
    },
    reviews: {
      async create(r) {
        if ([...reviews.values()].some((x) => x.userId === r.userId && x.listingId === r.listingId))
          throw Object.assign(new Error('duplicate review'), { code: 11000 });
        const now = new Date();
        const rec: ReviewRecord = { ...r, id: newId(), createdAt: now, updatedAt: now };
        reviews.set(rec.id, rec);
        return clone(rec);
      },
      async findById(id) {
        const r = reviews.get(id);
        return r ? clone(r) : null;
      },
      async findByUserAndListing(userId, listingId) {
        for (const r of reviews.values()) if (r.userId === userId && r.listingId === listingId) return clone(r);
        return null;
      },
      async list(q) {
        const hits = [...reviews.values()]
          .filter((r) => (!q.listingId || r.listingId === q.listingId) && (!q.status || r.status === q.status))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return paginate(hits, q.page, q.limit);
      },
      async setStatus(id, status, moderatedBy) {
        const r = reviews.get(id);
        if (!r) return null;
        Object.assign(r, { status, moderatedBy, updatedAt: new Date() });
        return clone(r);
      },
      async deleteByUser(userId) {
        const removed: Pick<ReviewRecord, 'listingId' | 'rating' | 'status'>[] = [];
        for (const [id, r] of reviews)
          if (r.userId === userId) {
            removed.push({ listingId: r.listingId, rating: r.rating, status: r.status });
            reviews.delete(id);
          }
        return removed;
      },
      async count(filter = {}) {
        return [...reviews.values()].filter((r) => !filter.status || r.status === filter.status).length;
      },
    },
    audit: {
      async log(entry) {
        audit.unshift({ ...clone(entry), id: newId(), createdAt: new Date() });
        if (audit.length > 10_000) audit.pop();
      },
      async list(q) {
        return paginate(audit, q.page, q.limit);
      },
    },
    async close() {},
  };
}
