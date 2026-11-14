import type { GeoPoint, ListingRecord, UserRecord } from '../domain/types.js';
import { haversineKm } from '../lib/util.js';
import type { Repository } from '../repo/types.js';

export type RecommendationReason = 'personalized' | 'nearby' | 'popular';

/**
 * Lightweight hybrid recommender (content + popularity + proximity).
 * Score = popularity (log-scaled views) + quality (Bayesian rating)
 *       + interest/region affinity (explicit prefs + categories of favorites/recent)
 *       + proximity bonus, minus items the user already saved.
 * Candidate pool is capped so cost stays O(pool). At scale, precompute
 * per-user candidates offline or move to a vector/feature store.
 */
export async function recommend(
  repo: Repository,
  opts: { user?: UserRecord; near?: GeoPoint; limit: number },
): Promise<{ items: ListingRecord[]; reason: RecommendationReason }> {
  const { items: pool } = await repo.listings.find({ sort: 'popular', limit: 300 });
  if (!pool.length) return { items: [], reason: 'popular' };

  const user = opts.user;
  const seen = new Set(user?.favorites ?? []);
  const affinityCats = new Map<string, number>();
  const affinityRegions = new Map<string, number>();
  if (user) {
    for (const c of user.preferences.interests) affinityCats.set(c, (affinityCats.get(c) ?? 0) + 2);
    for (const r of user.preferences.regions) affinityRegions.set(r, (affinityRegions.get(r) ?? 0) + 1.5);
    const behaviourIds = [...user.favorites.slice(0, 30), ...user.recent.slice(0, 20).map((r) => r.listingId)];
    if (behaviourIds.length) {
      const { items } = await repo.listings.find({ ids: behaviourIds, limit: 50 });
      for (const l of items) {
        if (l.category) affinityCats.set(l.category, (affinityCats.get(l.category) ?? 0) + 0.5);
        affinityRegions.set(l.region, (affinityRegions.get(l.region) ?? 0) + 0.3);
      }
    }
  }
  const personalized = affinityCats.size > 0 || affinityRegions.size > 0;

  const maxViews = Math.max(1, ...pool.map((l) => l.views));
  const meanRating = pool.reduce((s, l) => s + l.rating, 0) / pool.length;
  const scored = pool
    .filter((l) => !seen.has(l.id))
    .map((l) => {
      const popularity = Math.log1p(l.views) / Math.log1p(maxViews); // 0..1
      const bayes = (l.rating * l.reviewCount + meanRating * 5) / (l.reviewCount + 5) / 5; // 0..1
      const affinity =
        Math.min(3, (l.category ? affinityCats.get(l.category) ?? 0 : 0) + (affinityRegions.get(l.region) ?? 0)) / 3;
      const proximity = opts.near ? Math.max(0, 1 - haversineKm(opts.near, l.location) / 150) : 0;
      const score = popularity * 1 + bayes * 1.2 + affinity * 1.5 + proximity * 1.3;
      return { l, score };
    })
    .sort((a, b) => b.score - a.score);

  // Diversity: cap 3 items per kind+category bucket in the head of the list.
  const out: ListingRecord[] = [];
  const buckets = new Map<string, number>();
  for (const { l } of scored) {
    const key = `${l.kind}:${l.category ?? l.cuisine ?? l.hotelType}`;
    if ((buckets.get(key) ?? 0) >= 3) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
    out.push(l);
    if (out.length >= opts.limit) break;
  }
  return { items: out, reason: personalized ? 'personalized' : opts.near ? 'nearby' : 'popular' };
}
