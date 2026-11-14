import { Router } from 'express';
import { z } from 'zod';
import type { ListingRecord } from '../domain/types.js';
import { AppError, notFound } from '../lib/errors.js';
import { sanitizeText } from '../lib/util.js';
import { authenticate, requireVerifiedEmail } from '../middleware/auth.js';
import { b, p, q } from '../middleware/validate.js';
import { presentListing, presentMe, presentReview } from '../services/present.js';
import { applyRatingChange } from '../services/ratings.js';
import { LangQuery, objectId, PushTokenBody, ReviewBody, SessionBody } from '../services/schemas.js';
import { noStore } from '../security/guards.js';
import { type Ctx, langOf } from './context.js';

const MAX_FAVORITES = 500;
const MAX_URLS_IN_REVIEW = 2;

export function meRoutes(ctx: Ctx): Router {
  const r = Router();
  const { repo, limiters } = ctx;
  const auth = authenticate(ctx, { required: true });
  r.use(noStore);

  /** Called by clients right after Firebase sign-in to provision/refresh the profile. */
  r.post('/auth/session', limiters.auth, auth, limiters.write, async (req, res) => {
    const v = b(req, SessionBody);
    let user = req.user!;
    const patch: Record<string, unknown> = {};
    if (v.displayName) patch.displayName = sanitizeText(v.displayName);
    if (v.language) patch.preferences = { ...user.preferences, language: v.language };
    if (Object.keys(patch).length) user = (await repo.users.update(user.id, patch)) ?? user;
    res.json(presentMe(user));
  });

  r.get('/me', auth, (req, res) => {
    res.json(presentMe(req.user!));
  });

  r.patch('/me', auth, limiters.write, async (req, res) => {
    const v = b(req, ctx.schemas.MeBody);
    const user = req.user!;
    const updated = await repo.users.update(user.id, {
      ...(v.displayName ? { displayName: sanitizeText(v.displayName) } : {}),
      ...(v.photoUrl ? { photoUrl: v.photoUrl } : {}),
      ...(v.preferences ? { preferences: { ...user.preferences, ...v.preferences } } : {}),
    });
    res.json(presentMe(updated ?? user));
  });

  /** Right to erasure: removes profile, favorites, reviews and the Firebase account. */
  r.delete('/me', auth, limiters.write, async (req, res) => {
    const user = req.user!;
    const removed = await repo.reviews.deleteByUser(user.id);
    for (const rv of removed) if (rv.status === 'approved') await applyRatingChange(repo, rv.listingId, { remove: rv.rating });
    await repo.users.delete(user.id);
    await ctx.identity.deleteUser(user.firebaseUid);
    req.log?.info({ userId: user.id }, 'account deleted');
    res.status(204).end();
  });

  const loadListings = async (ids: string[]): Promise<ListingRecord[]> => {
    if (!ids.length) return [];
    const { items } = await repo.listings.find({ ids, limit: ids.length });
    const byId = new Map(items.map((l) => [l.id, l]));
    return ids.map((id) => byId.get(id)).filter((l): l is ListingRecord => !!l);
  };

  r.get('/me/favorites', auth, async (req, res) => {
    const lang = langOf(req, q(req, LangQuery).lang);
    const items = await loadListings(req.user!.favorites);
    res.json({ data: items.map((l) => presentListing(l, lang)) });
  });

  r.put('/me/favorites/:listingId', auth, limiters.write, async (req, res) => {
    const { listingId } = p(req, z.object({ listingId: objectId }).strict());
    const l = await repo.listings.findById(listingId);
    if (!l || l.status !== 'published') throw notFound('Listing');
    if (req.user!.favorites.length >= MAX_FAVORITES && !req.user!.favorites.includes(listingId))
      throw new AppError('CONFLICT', `You can save at most ${MAX_FAVORITES} favorites`);
    await repo.users.addFavorite(req.user!.id, listingId);
    res.status(204).end();
  });

  r.delete('/me/favorites/:listingId', auth, limiters.write, async (req, res) => {
    const { listingId } = p(req, z.object({ listingId: objectId }).strict());
    await repo.users.removeFavorite(req.user!.id, listingId);
    res.status(204).end();
  });

  r.get('/me/recent', auth, async (req, res) => {
    const lang = langOf(req, q(req, LangQuery).lang);
    const items = await loadListings(req.user!.recent.map((x) => x.listingId));
    res.json({ data: items.map((l) => presentListing(l, lang)) });
  });

  r.post('/me/push-token', auth, limiters.write, async (req, res) => {
    const v = b(req, PushTokenBody);
    const user = req.user!;
    const tokens = [{ ...v, updatedAt: new Date() }, ...user.pushTokens.filter((t) => t.token !== v.token)].slice(0, 5);
    await repo.users.update(user.id, { pushTokens: tokens });
    res.status(204).end();
  });

  /* -------------------------------- reviews -------------------------------- */

  r.post('/listings/:id/reviews', auth, limiters.review, requireVerifiedEmail, async (req, res) => {
    const { id } = p(req, z.object({ id: objectId }).strict());
    const v = b(req, ReviewBody);
    const listing = await repo.listings.findById(id);
    if (!listing || listing.status !== 'published') throw notFound('Listing');
    const comment = sanitizeText(v.comment);
    if (comment.length < 10) throw new AppError('VALIDATION_ERROR', 'Comment is too short');
    if ((comment.match(/https?:\/\/|www\./gi) ?? []).length > MAX_URLS_IN_REVIEW)
      throw new AppError('VALIDATION_ERROR', 'Too many links in the comment');
    if (await repo.reviews.findByUserAndListing(req.user!.id, id))
      throw new AppError('CONFLICT', 'You have already reviewed this listing');
    // All reviews enter a moderation queue; only approved ones are public.
    const review = await repo.reviews.create({ listingId: id, userId: req.user!.id, rating: v.rating, comment, status: 'pending' });
    res.status(201).json(presentReview(review, req.user));
  });

  return r;
}
