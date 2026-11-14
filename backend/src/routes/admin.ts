import { Router, type Request } from 'express';
import { z } from 'zod';
import type { AuditRecord, ListingInput, ListingRecord } from '../domain/types.js';
import { AppError, forbidden, notFound } from '../lib/errors.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { b, p, parse, q } from '../middleware/validate.js';
import { paginated, presentAdminListing, presentAudit, presentMe, presentReview } from '../services/present.js';
import { applyRatingChange } from '../services/ratings.js';
import {
  AdminListingsQuery, AdminReviewsQuery, AdminUserPatch, AdminUsersQuery, objectId, PageQuery,
  ReviewModerationBody,
} from '../services/schemas.js';
import { noStore } from '../security/guards.js';
import { type Ctx, clientIp } from './context.js';

const IdParam = z.object({ id: objectId }).strict();

/** Strip server-managed fields so a record can be re-validated as input. */
function toInput(l: ListingRecord): Record<string, unknown> {
  const { id, rating, reviewCount, views, createdAt, updatedAt, ...input } = l;
  return JSON.parse(JSON.stringify(input)); // drop undefined + normalise dates
}

export function adminRoutes(ctx: Ctx): Router {
  const r = Router();
  const { repo, schemas, identity } = ctx;

  // Layered gate: valid (and non-revoked) token → active account → staff role → admin rate limit.
  r.use(noStore, authenticate(ctx, { required: true, checkRevoked: true }), requireRole('editor'), ctx.limiters.admin);

  const audit = (req: Request, action: string, targetType: AuditRecord['targetType'], targetId: string, meta?: Record<string, unknown>) =>
    repo.audit.log({ actorId: req.user!.id, actorEmail: req.user!.email, action, targetType, targetId, ip: clientIp(req), ...(meta ? { meta } : {}) });

  r.get('/stats', async (_req, res) => {
    const [byKind, users, pendingReviews, top] = await Promise.all([
      repo.listings.countBy('kind'),
      repo.users.count(),
      repo.reviews.count({ status: 'pending' }),
      repo.listings.find({ status: 'any', sort: 'popular', limit: 5 }),
    ]);
    res.json({
      listings: { place: byKind.place ?? 0, restaurant: byKind.restaurant ?? 0, hotel: byKind.hotel ?? 0 },
      users,
      pendingReviews,
      topViewed: top.items.map(presentAdminListing),
    });
  });

  /* -------------------------------- listings -------------------------------- */

  r.get('/listings', async (req, res) => {
    const v = q(req, AdminListingsQuery);
    const { items, total } = await repo.listings.find({
      kind: v.kind, status: v.status ?? 'any', q: v.q, sort: 'newest', page: v.page, limit: v.limit,
    });
    res.json(paginated(items.map(presentAdminListing), v.page, v.limit, total));
  });

  r.get('/listings/:id', async (req, res) => {
    const { id } = p(req, IdParam);
    const l = await repo.listings.findById(id);
    if (!l) throw notFound('Listing');
    res.json(presentAdminListing(l));
  });

  r.post('/listings', async (req, res) => {
    const input = b(req, schemas.ListingInputSchema) as ListingInput;
    if (await repo.listings.findBySlug(input.slug)) throw new AppError('CONFLICT', 'Slug already in use');
    const created = await repo.listings.create(input);
    await audit(req, 'listing.create', 'listing', created.id, { kind: created.kind, slug: created.slug });
    res.status(201).json(presentAdminListing(created));
  });

  r.patch('/listings/:id', async (req, res) => {
    const { id } = p(req, IdParam);
    const patch = b(req, schemas.ListingPatchSchema);
    const cur = await repo.listings.findById(id);
    if (!cur) throw notFound('Listing');
    // Re-validate the merged document so per-kind invariants always hold.
    const merged = parse(schemas.ListingInputSchema, { ...toInput(cur), ...JSON.parse(JSON.stringify(patch)) }, 'listing') as ListingInput;
    if (merged.slug !== cur.slug && (await repo.listings.findBySlug(merged.slug))) throw new AppError('CONFLICT', 'Slug already in use');
    const updated = await repo.listings.update(id, merged);
    await audit(req, 'listing.update', 'listing', id, { fields: Object.keys(patch) });
    res.json(presentAdminListing(updated!));
  });

  r.delete('/listings/:id', requireRole('admin'), async (req, res) => {
    const { id } = p(req, IdParam);
    if (!(await repo.listings.delete(id))) throw notFound('Listing');
    await audit(req, 'listing.delete', 'listing', id);
    res.status(204).end();
  });

  /* --------------------------------- reviews --------------------------------- */

  r.get('/reviews', async (req, res) => {
    const v = q(req, AdminReviewsQuery);
    const { items, total } = await repo.reviews.list({ status: v.status, page: v.page, limit: v.limit });
    const rows = await Promise.all(
      items.map(async (rv) => {
        const [author, listing] = await Promise.all([repo.users.findById(rv.userId), repo.listings.findById(rv.listingId)]);
        return { ...presentReview(rv, author), listingName: listing?.name.en ?? '(deleted)', userEmail: author?.email ?? '(deleted)' };
      }),
    );
    res.json(paginated(rows, v.page, v.limit, total));
  });

  r.patch('/reviews/:id', async (req, res) => {
    const { id } = p(req, IdParam);
    const { status } = b(req, ReviewModerationBody);
    const cur = await repo.reviews.findById(id);
    if (!cur) throw notFound('Review');
    if (cur.status !== status) {
      const updated = await repo.reviews.setStatus(id, status, req.user!.id);
      if (status === 'approved') await applyRatingChange(repo, cur.listingId, { add: cur.rating });
      else if (cur.status === 'approved') await applyRatingChange(repo, cur.listingId, { remove: cur.rating });
      await audit(req, `review.${status}`, 'review', id, { listingId: cur.listingId });
      const author = await repo.users.findById(cur.userId);
      return void res.json(presentReview(updated!, author));
    }
    res.json(presentReview(cur, await repo.users.findById(cur.userId)));
  });

  /* ---------------------------------- users ---------------------------------- */

  r.get('/users', requireRole('admin'), async (req, res) => {
    const v = q(req, AdminUsersQuery);
    const { items, total } = await repo.users.list(v);
    res.json(paginated(items.map(presentMe), v.page, v.limit, total));
  });

  r.patch('/users/:id', requireRole('admin'), async (req, res) => {
    const { id } = p(req, IdParam);
    const v = b(req, AdminUserPatch);
    if (id === req.user!.id) throw forbidden('You cannot change your own role or status');
    const target = await repo.users.findById(id);
    if (!target) throw notFound('User');
    // Because admins can never change themselves, the acting admin always remains:
    // the system can't be left without an administrator.
    const losesPrivileges = target.role !== 'user' && v.role !== undefined && v.role !== target.role;
    const updated = await repo.users.update(id, { ...(v.role ? { role: v.role } : {}), ...(v.status ? { status: v.status } : {}) });
    if (v.role) await identity.setRoleClaim(target.firebaseUid, v.role).catch(() => undefined);
    // Suspension or demotion: kill existing sessions so the change applies immediately.
    if (v.status === 'suspended' || losesPrivileges) await identity.revokeSessions(target.firebaseUid).catch(() => undefined);
    await audit(req, 'user.update', 'user', id, { from: { role: target.role, status: target.status }, to: v });
    res.json(presentMe(updated!));
  });

  r.get('/audit-logs', requireRole('admin'), async (req, res) => {
    const v = q(req, PageQuery);
    const { items, total } = await repo.audit.list(v);
    res.json(paginated(items.map(presentAudit), v.page, v.limit, total));
  });

  return r;
}
