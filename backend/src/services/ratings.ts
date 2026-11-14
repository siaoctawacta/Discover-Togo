import type { Repository } from '../repo/types.js';

/**
 * Incrementally maintain a listing's denormalised average rating when a
 * review enters (`add`) or leaves (`remove`) the approved set. Incremental
 * maths keeps curated seed ratings intact and makes updates O(1).
 */
export async function applyRatingChange(repo: Repository, listingId: string, change: { add?: number; remove?: number }) {
  const l = await repo.listings.findById(listingId);
  if (!l) return;
  let sum = l.rating * l.reviewCount;
  let count = l.reviewCount;
  if (change.add !== undefined) {
    sum += change.add;
    count += 1;
  }
  if (change.remove !== undefined && count > 0) {
    sum -= change.remove;
    count -= 1;
  }
  const rating = count > 0 ? Math.min(5, Math.max(0, sum / count)) : 0;
  await repo.listings.setRating(listingId, Math.round(rating * 100) / 100, count);
}
