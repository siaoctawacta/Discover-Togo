import { Router, type Request } from 'express';
import { z } from 'zod';
import {
  AMENITY_LABELS, CATEGORY_LABELS, CUISINE_LABELS, HOTEL_TYPE_LABELS, labelList, REGIONS,
} from '../domain/catalog.js';
import { KINDS, PLACE_CATEGORIES, type Kind, type ListingRecord } from '../domain/types.js';
import { notFound } from '../lib/errors.js';
import { OBJECT_ID_RE } from '../lib/util.js';
import { authenticate } from '../middleware/auth.js';
import { p, q } from '../middleware/validate.js';
import type { ListingQuery } from '../repo/types.js';
import { paginated, presentListing, presentMapPin, presentReview } from '../services/present.js';
import { recommend } from '../services/recommend.js';
import {
  HotelsQuery, idOrSlug, LangQuery, MapQuery, objectId, PageQuery, PlacesQuery, RecommendationsQuery,
  RestaurantsQuery, SearchQuery,
} from '../services/schemas.js';
import { publicCache } from '../security/guards.js';
import { type Ctx, clientIp, langOf } from './context.js';

const RECENT_MAX = 20;

export function publicRoutes(ctx: Ctx): Router {
  const r = Router();
  const { repo } = ctx;
  const optionalAuth = authenticate(ctx, { required: false });

  r.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  r.get('/meta', publicCache(3600), (req, res) => {
    const lang = langOf(req, q(req, LangQuery).lang);
    res.json({
      regions: REGIONS.map((x) => ({ id: x.id, name: x.name[lang], cities: x.cities })),
      categories: labelList(CATEGORY_LABELS, lang),
      cuisines: labelList(CUISINE_LABELS, lang),
      hotelTypes: labelList(HOTEL_TYPE_LABELS, lang),
      amenities: labelList(AMENITY_LABELS, lang),
    });
  });

  r.get('/home', publicCache(120), async (req, res) => {
    const lang = langOf(req, q(req, LangQuery).lang);
    const show = (l: ListingRecord) => presentListing(l, lang);
    const [hero, featured, restaurants, hotels, experiences, counts] = await Promise.all([
      repo.listings.find({ kind: 'place', featured: true, sort: 'rating', limit: 5 }),
      repo.listings.find({ kind: 'place', sort: 'popular', limit: 10 }),
      repo.listings.find({ kind: 'restaurant', sort: 'rating', limit: 10 }),
      repo.listings.find({ kind: 'hotel', sort: 'rating', limit: 10 }),
      repo.listings.find({ kind: 'place', categories: ['adventure', 'culture'], sort: 'popular', limit: 10 }),
      repo.listings.countBy('category', { status: 'published', kind: 'place' }),
    ]);
    // Sponsored (paid) listings float to the front of curated rails.
    const sponsoredFirst = (items: ListingRecord[]) =>
      [...items].sort((a, b) => Number(!!b.sponsoredUntil && b.sponsoredUntil > new Date()) - Number(!!a.sponsoredUntil && a.sponsoredUntil > new Date()));
    res.json({
      hero: hero.items.map(show),
      featured: sponsoredFirst(featured.items).map(show),
      topRestaurants: sponsoredFirst(restaurants.items).map(show),
      topHotels: sponsoredFirst(hotels.items).map(show),
      experiences: experiences.items.map(show),
      categories: PLACE_CATEGORIES.map((id) => ({ id, label: CATEGORY_LABELS[id][lang], count: counts[id] ?? 0 })),
    });
  });

  /* --------------------------- typed list endpoints --------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listEndpoint = (path: string, kind: Kind, schema: z.ZodType, toQuery: (v: any) => Partial<ListingQuery>) => {
    r.get(path, publicCache(60), async (req, res) => {
      const v = q(req, schema) as {
        lang?: 'en' | 'fr'; page: number; limit: number; lat?: number; lng?: number;
        q?: string; region?: ListingQuery['region']; city?: string; minRating?: number; sort?: ListingQuery['sort'];
      };
      const near = v.lat !== undefined && v.lng !== undefined ? { lat: v.lat, lng: v.lng } : undefined;
      const lang = langOf(req, v.lang);
      const { items, total } = await repo.listings.find({
        kind, q: v.q, region: v.region, city: v.city, minRating: v.minRating, sort: v.sort, near,
        page: v.page, limit: v.limit, ...toQuery(v),
      });
      res.json(paginated(items.map((l) => presentListing(l, lang, near)), v.page, v.limit, total));
    });

    r.get(`${path}/:idOrSlug`, optionalAuth, async (req, res) => {
      const { idOrSlug: key } = p(req, z.object({ idOrSlug }).strict());
      const lang = langOf(req, q(req, LangQuery).lang);
      const l = OBJECT_ID_RE.test(key) ? await repo.listings.findById(key) : await repo.listings.findBySlug(key);
      if (!l || l.kind !== kind || l.status !== 'published') throw notFound('Listing');
      const viewer = req.user ? `u:${req.user.id}` : `ip:${clientIp(req)}`;
      if (ctx.viewDedup.add(`${viewer}:${l.id}`)) void repo.listings.incrementViews(l.id).catch(() => undefined);
      if (req.user) await repo.users.pushRecent(req.user.id, l.id, RECENT_MAX);
      res.setHeader('Cache-Control', 'private, max-age=60');
      res.json(presentListing(l, lang));
    });
  };

  listEndpoint('/places', 'place', PlacesQuery, (v) => ({ category: v.category }));
  listEndpoint('/restaurants', 'restaurant', RestaurantsQuery, (v) => ({
    cuisine: v.cuisine,
    priceLevels: v.priceLevel?.map(Number),
  }));
  listEndpoint('/hotels', 'hotel', HotelsQuery, (v) => ({
    hotelType: v.hotelType, minPrice: v.minPrice, maxPrice: v.maxPrice,
  }));

  /* ------------------------------- discovery ------------------------------- */

  r.get('/search', ctx.limiters.search, publicCache(60), async (req, res) => {
    const v = q(req, SearchQuery);
    const lang = langOf(req, v.lang);
    const kinds = v.kinds ?? [...KINDS];
    const run = (kind: Kind) =>
      kinds.includes(kind) ? repo.listings.find({ kind, q: v.q, sort: 'popular', limit: v.limit }) : Promise.resolve({ items: [], total: 0 });
    const [places, restaurants, hotels] = await Promise.all([run('place'), run('restaurant'), run('hotel')]);
    const show = (xs: ListingRecord[]) => xs.map((l) => presentListing(l, lang));
    res.json({
      query: v.q,
      results: { places: show(places.items), restaurants: show(restaurants.items), hotels: show(hotels.items) },
      total: places.total + restaurants.total + hotels.total,
    });
  });

  r.get('/recommendations', optionalAuth, async (req: Request, res) => {
    const v = q(req, RecommendationsQuery);
    const lang = langOf(req, v.lang);
    const near = v.lat !== undefined && v.lng !== undefined ? { lat: v.lat, lng: v.lng } : undefined;
    const { items, reason } = await recommend(repo, { user: req.user, near, limit: v.limit });
    res.setHeader('Cache-Control', 'private, no-store');
    res.json({ data: items.map((l) => presentListing(l, lang, near)), reason });
  });

  r.get('/map', publicCache(120), async (req, res) => {
    const v = q(req, MapQuery);
    const lang = langOf(req, v.lang);
    const { items } = await repo.listings.find({ kinds: v.kinds, bbox: v.bbox as ListingQuery['bbox'], limit: 500, sort: 'popular' });
    res.json({ data: items.map((l) => presentMapPin(l, lang)) });
  });

  r.get('/listings/:id/reviews', publicCache(60), async (req, res) => {
    const { id } = p(req, z.object({ id: objectId }).strict());
    const v = q(req, PageQuery);
    const listing = await repo.listings.findById(id);
    if (!listing || listing.status !== 'published') throw notFound('Listing');
    const { items, total } = await repo.reviews.list({ listingId: id, status: 'approved', page: v.page, limit: v.limit });
    const authors = await Promise.all(items.map((x) => repo.users.findById(x.userId)));
    res.json(paginated(items.map((x, i) => presentReview(x, authors[i])), v.page, v.limit, total));
  });

  return r;
}
