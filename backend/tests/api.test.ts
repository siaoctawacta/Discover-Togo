import { describe, expect, it } from 'vitest';
import { as, makeApp, validListing } from './helpers.js';

describe('public catalogue', () => {
  it('serves the home dashboard with all rails', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/home').expect(200);
    for (const k of ['hero', 'featured', 'topRestaurants', 'topHotels', 'experiences', 'categories'])
      expect(res.body[k], k).toBeInstanceOf(Array);
    expect(res.body.hero.length).toBeGreaterThan(0);
    expect(res.body.topRestaurants[0].kind).toBe('restaurant');
    // sponsored listings are pinned first in curated rails
    expect(res.body.topHotels[0].sponsored).toBe(true);
  });

  it('localizes content with ?lang and Accept-Language', async () => {
    const { api } = makeApp();
    const fr = await api.get('/api/v1/places/lake-togo-togoville?lang=fr').expect(200);
    expect(fr.body.name).toBe('Lac Togo et Togoville');
    const al = await api.get('/api/v1/places/lake-togo-togoville').set('Accept-Language', 'fr-FR,fr;q=0.9').expect(200);
    expect(al.body.name).toBe('Lac Togo et Togoville');
    const en = await api.get('/api/v1/places/lake-togo-togoville').expect(200);
    expect(en.body.name).toBe('Lake Togo & Togoville');
  });

  it('filters places by region and category, paginates', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/places?region=plateaux&category=nature&limit=2').expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.hasMore).toBe(true);
    for (const p of res.body.data) {
      expect(p.region).toBe('plateaux');
      expect(p.category).toBe('nature');
    }
  });

  it('filters by city accent-insensitively', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/places?city=lome').expect(200);
    expect(res.body.total).toBeGreaterThan(3);
    expect(res.body.data.every((p: { city: string }) => p.city === 'Lomé')).toBe(true);
  });

  it('filters restaurants by cuisine and price level list', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/restaurants?priceLevel=1,2&cuisine=local').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const r of res.body.data) {
      expect(r.cuisine).toBe('local');
      expect([1, 2]).toContain(r.priceLevel);
      expect(r.menu).toBeInstanceOf(Array);
    }
  });

  it('filters hotels by overlapping price range and rating', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/hotels?maxPrice=20000&minRating=4').expect(200);
    expect(res.body.total).toBeGreaterThan(0);
    for (const h of res.body.data) {
      expect(h.priceRange.min).toBeLessThanOrEqual(20000);
      expect(h.rating).toBeGreaterThanOrEqual(4);
    }
  });

  it('sorts by distance and returns distanceKm', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/places?sort=distance&lat=6.9&lng=0.63&limit=3').expect(200);
    const d = res.body.data.map((p: { distanceKm: number }) => p.distanceKm);
    expect(d).toEqual([...d].sort((a: number, b: number) => a - b));
    expect(res.body.data[0].city).toBe('Kpalimé');
  });

  it('rejects sort=distance without coordinates', async () => {
    const { api } = makeApp();
    await api.get('/api/v1/places?sort=distance').expect(400);
  });

  it('returns detail by id or slug, 404 for wrong kind', async () => {
    const { api } = makeApp();
    const bySlug = await api.get('/api/v1/hotels/coco-beach-resort').expect(200);
    await api.get(`/api/v1/hotels/${bySlug.body.id}`).expect(200);
    await api.get(`/api/v1/places/${bySlug.body.id}`).expect(404);
    expect(bySlug.body.amenities).toContain('beach_access');
  });

  it('global search groups results by kind', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/search?q=lome').expect(200);
    expect(res.body.results.places.length).toBeGreaterThan(0);
    expect(res.body.results.restaurants.length).toBeGreaterThan(0);
    expect(res.body.results.hotels.length).toBeGreaterThan(0);
    const only = await api.get('/api/v1/search?q=lome&kinds=hotel').expect(200);
    expect(only.body.results.places).toHaveLength(0);
  });

  it('map returns lightweight pins within a bbox', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/map?bbox=0.5,6.8,0.8,7.0').expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const pin of res.body.data) {
      expect(pin.location.lat).toBeGreaterThanOrEqual(6.8);
      expect(pin).not.toHaveProperty('description');
    }
    await api.get('/api/v1/map?bbox=1,1,0,0').expect(400);
  });

  it('meta exposes regions, categories and labels', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/meta?lang=fr').expect(200);
    expect(res.body.regions.map((r: { id: string }) => r.id)).toEqual(['maritime', 'plateaux', 'centrale', 'kara', 'savanes']);
    expect(res.body.categories.find((c: { id: string }) => c.id === 'beach').label).toBe('Plage');
  });
});

describe('user features', () => {
  it('favorites: add, list, remove', async () => {
    const { api } = makeApp();
    const { body: l } = await api.get('/api/v1/places/mount-agou').expect(200);
    await api.put(`/api/v1/me/favorites/${l.id}`).set(as('ana')).expect(204);
    await api.put(`/api/v1/me/favorites/${l.id}`).set(as('ana')).expect(204); // idempotent
    const favs = await api.get('/api/v1/me/favorites').set(as('ana')).expect(200);
    expect(favs.body.data.map((x: { id: string }) => x.id)).toEqual([l.id]);
    await api.delete(`/api/v1/me/favorites/${l.id}`).set(as('ana')).expect(204);
    expect((await api.get('/api/v1/me/favorites').set(as('ana'))).body.data).toHaveLength(0);
  });

  it('records recently viewed for signed-in users, newest first, deduplicated', async () => {
    const { api } = makeApp();
    await api.get('/api/v1/places/mount-agou').set(as('bo')).expect(200);
    await api.get('/api/v1/hotels/coco-beach-resort').set(as('bo')).expect(200);
    await api.get('/api/v1/places/mount-agou').set(as('bo')).expect(200);
    const res = await api.get('/api/v1/me/recent').set(as('bo')).expect(200);
    expect(res.body.data.map((x: { slug: string }) => x.slug)).toEqual(['mount-agou', 'coco-beach-resort']);
  });

  it('updates profile preferences', async () => {
    const { api } = makeApp();
    const res = await api
      .patch('/api/v1/me')
      .set(as('cy'))
      .send({ displayName: 'Cy', preferences: { language: 'fr', interests: ['beach'] } })
      .expect(200);
    expect(res.body.preferences).toMatchObject({ language: 'fr', interests: ['beach'], theme: 'system' });
  });

  it('personalized recommendations follow interests and exclude favorites', async () => {
    const { api } = makeApp();
    await api.patch('/api/v1/me').set(as('dee')).send({ preferences: { interests: ['beach'] } }).expect(200);
    const { body: coco } = await api.get('/api/v1/places/coco-beach-lome').expect(200);
    await api.put(`/api/v1/me/favorites/${coco.id}`).set(as('dee')).expect(204);
    const res = await api.get('/api/v1/recommendations?limit=5').set(as('dee')).expect(200);
    expect(res.body.reason).toBe('personalized');
    expect(res.body.data.map((x: { id: string }) => x.id)).not.toContain(coco.id);
    expect(res.body.data.some((x: { category?: string }) => x.category === 'beach')).toBe(true);
    const anon = await api.get('/api/v1/recommendations?lat=10.9&lng=0.35').expect(200);
    expect(anon.body.reason).toBe('nearby');
  });

  it('reviews go through moderation and update ratings', async () => {
    const { api, repo } = makeApp();
    const { body: l } = await api.get('/api/v1/places/atakpame-hills').expect(200);
    const created = await api
      .post(`/api/v1/listings/${l.id}/reviews`)
      .set(as('eve'))
      .send({ rating: 5, comment: 'Wonderful <script>alert(1)</script>views from the hills!' })
      .expect(201);
    expect(created.body.status).toBe('pending');
    expect(created.body.comment).not.toContain('<script>');
    // not public until approved
    expect((await api.get(`/api/v1/listings/${l.id}/reviews`)).body.total).toBe(0);
    await api.post(`/api/v1/listings/${l.id}/reviews`).set(as('eve')).send({ rating: 4, comment: 'Second try at reviewing' }).expect(409);

    const queue = await api.get('/api/v1/admin/reviews?status=pending').set(as('mod', 'editor')).expect(200);
    expect(queue.body.data[0].userEmail).toBe('eve@dev.local');
    await api.patch(`/api/v1/admin/reviews/${created.body.id}`).set(as('mod', 'editor')).send({ status: 'approved' }).expect(200);

    const pub = await api.get(`/api/v1/listings/${l.id}/reviews`).expect(200);
    expect(pub.body.total).toBe(1);
    expect(pub.body.data[0]).not.toHaveProperty('userId');
    const after = await api.get('/api/v1/places/atakpame-hills').expect(200);
    expect(after.body.reviewCount).toBe(l.reviewCount + 1);
    expect((await repo.listings.findById(l.id))!.rating).toBeGreaterThan(l.rating);

    // rejecting a previously approved review reverts the rating
    await api.patch(`/api/v1/admin/reviews/${created.body.id}`).set(as('mod', 'editor')).send({ status: 'rejected' }).expect(200);
    const reverted = await api.get('/api/v1/places/atakpame-hills').expect(200);
    expect(reverted.body.reviewCount).toBe(l.reviewCount);
    expect(reverted.body.rating).toBeCloseTo(l.rating, 1);
  });

  it('account deletion removes the profile', async () => {
    const { api, repo } = makeApp();
    await api.get('/api/v1/me').set(as('gone')).expect(200);
    await api.delete('/api/v1/me').set(as('gone')).expect(204);
    expect(await repo.users.findByFirebaseUid('dev_gone')).toBeNull();
  });
});

describe('admin', () => {
  it('editor can create, update and publish listings; changes are audited', async () => {
    const { api } = makeApp();
    const created = await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing({ status: 'draft' })).expect(201);
    expect(created.body.name).toEqual({ en: 'Test Place', fr: 'Lieu test' });
    await api.get('/api/v1/places/test-place').expect(404); // drafts are not public
    await api.patch(`/api/v1/admin/listings/${created.body.id}`).set(as('ed', 'editor')).send({ status: 'published' }).expect(200);
    await api.get('/api/v1/places/test-place').expect(200);
    await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing()).expect(409);

    const logs = await api.get('/api/v1/admin/audit-logs').set(as('root', 'admin')).expect(200);
    expect(logs.body.data.map((x: { action: string }) => x.action)).toEqual(['listing.update', 'listing.create']);
  });

  it('enforces per-kind invariants, also on merged PATCH', async () => {
    const { api } = makeApp();
    await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing({ cuisine: 'local' })).expect(400);
    await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing({ kind: 'hotel', category: undefined })).expect(400);
    await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing({ city: 'Kara' })).expect(400); // Kara ∉ maritime
    const { body } = await api.post('/api/v1/admin/listings').set(as('ed', 'editor')).send(validListing()).expect(201);
    await api.patch(`/api/v1/admin/listings/${body.id}`).set(as('ed', 'editor')).send({ priceLevel: 2 }).expect(400);
  });

  it('admin stats', async () => {
    const { api } = makeApp();
    const res = await api.get('/api/v1/admin/stats').set(as('root', 'admin')).expect(200);
    expect(res.body.listings).toEqual({ place: 22, restaurant: 10, hotel: 10 });
  });
});
