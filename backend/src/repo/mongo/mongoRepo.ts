import mongoose, { type SortOrder } from 'mongoose';
import type { AuditRecord, ListingInput, ListingRecord, ReviewRecord, UserRecord } from '../../domain/types.js';
import { escapeRegex, fold } from '../../lib/util.js';
import type { ListingQuery, Repository } from '../types.js';
import { AuditModel, ListingModel, ReviewModel, UserModel } from './models.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = Record<string, any>;

const oid = (id: string) => new mongoose.Types.ObjectId(id);

function toListing(d: Doc): ListingRecord {
  const { _id, __v, geo, cityFolded, searchText, ...rest } = d;
  return { ...rest, id: String(_id), location: { lng: geo.coordinates[0], lat: geo.coordinates[1] } } as ListingRecord;
}

function fromListingInput(input: Partial<ListingInput>): Doc {
  const { location, ...rest } = input;
  const out: Doc = { ...rest };
  if (location) out.geo = { type: 'Point', coordinates: [location.lng, location.lat] };
  if (input.city) out.cityFolded = fold(input.city);
  return out;
}

function searchTextOf(l: Pick<ListingRecord, 'name' | 'city' | 'tags'>) {
  return fold([l.name.en, l.name.fr, l.city, ...l.tags].join(' '));
}

const toUser = (d: Doc): UserRecord => {
  const { _id, __v, favorites = [], recent = [], ...rest } = d;
  return {
    ...rest,
    id: String(_id),
    favorites: favorites.map(String),
    recent: recent.map((r: Doc) => ({ listingId: String(r.listingId), at: r.at })),
  } as UserRecord;
};
const toReview = (d: Doc): ReviewRecord => {
  const { _id, __v, listingId, userId, moderatedBy, ...rest } = d;
  return {
    ...rest,
    id: String(_id),
    listingId: String(listingId),
    userId: String(userId),
    ...(moderatedBy ? { moderatedBy: String(moderatedBy) } : {}),
  } as ReviewRecord;
};
const toAudit = (d: Doc): AuditRecord => {
  const { _id, __v, ...rest } = d;
  return { ...rest, id: String(_id) } as AuditRecord;
};

export function listingFilter(q: ListingQuery): Doc {
  const f: Doc = {};
  const status = q.status ?? 'published';
  if (status !== 'any') f.status = status;
  if (q.kind) f.kind = q.kind;
  if (q.kinds) f.kind = { $in: q.kinds };
  if (q.region) f.region = q.region;
  if (q.city) f.cityFolded = fold(q.city);
  if (q.category) f.category = q.category;
  if (q.categories) f.category = { $in: q.categories };
  if (q.cuisine) f.cuisine = q.cuisine;
  if (q.priceLevels) f.priceLevel = { $in: q.priceLevels };
  if (q.hotelType) f.hotelType = q.hotelType;
  if (q.minPrice !== undefined) f['priceRange.max'] = { $gte: q.minPrice };
  if (q.maxPrice !== undefined) f['priceRange.min'] = { $lte: q.maxPrice };
  if (q.minRating !== undefined) f.rating = { $gte: q.minRating };
  if (q.featured !== undefined) f.featured = q.featured;
  const idIn = q.ids?.map(oid);
  const idNin = q.excludeIds?.map(oid);
  if (idIn || idNin) f._id = { ...(idIn ? { $in: idIn } : {}), ...(idNin ? { $nin: idNin } : {}) };
  // User text is folded + escaped, so it is matched literally (no regex injection / ReDoS).
  if (q.q) f.searchText = { $regex: escapeRegex(fold(q.q)) };
  if (q.bbox) {
    const [minLng, minLat, maxLng, maxLat] = q.bbox;
    f.geo = { $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] } };
  } else if (q.sort === 'distance' && q.near) {
    f.geo = { $nearSphere: { $geometry: { type: 'Point', coordinates: [q.near.lng, q.near.lat] } } };
  }
  return f;
}

/**
 * `sanitizeFilter` (enabled globally) wraps any `{$op: …}` value in `$eq`, which
 * neutralises operator injection from user input. Filters built here contain
 * operators we created ourselves from zod-validated, typed values, so each such
 * value is explicitly marked trusted. Never pass raw request data through this.
 */
export function trusted<T extends Doc>(filter: T): T {
  for (const [k, v] of Object.entries(filter)) {
    if ((k === '$or' || k === '$and' || k === '$nor') && Array.isArray(v)) v.forEach((sub) => trusted(sub));
    else if (v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof mongoose.Types.ObjectId) && Object.keys(v).some((x) => x.startsWith('$')))
      (filter as Doc)[k] = mongoose.trusted(v);
  }
  return filter;
}

const SORTS: Record<string, Record<string, SortOrder>> = {
  popular: { views: -1, rating: -1, slug: 1 },
  rating: { rating: -1, reviewCount: -1, slug: 1 },
  newest: { createdAt: -1, slug: 1 },
};

export async function createMongoRepository(uri: string): Promise<Repository> {
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    autoIndex: process.env.NODE_ENV !== 'production',
  });

  return {
    listings: {
      async find(q) {
        const filter = trusted(listingFilter(q));
        const limit = q.limit ?? 20;
        const skip = ((q.page ?? 1) - 1) * limit;
        let query = ListingModel.find(filter).skip(skip).limit(limit).lean();
        // $nearSphere already orders by distance and cannot be combined with sort()
        if (!(q.sort === 'distance' && q.near && !q.bbox)) query = query.sort(SORTS[q.sort ?? 'popular'] ?? SORTS.popular!);
        // countDocuments does not support $nearSphere; use $geoWithin-free filter for count
        const countFilter = { ...filter };
        if (countFilter.geo?.$nearSphere) delete countFilter.geo;
        const [docs, total] = await Promise.all([query, ListingModel.countDocuments(trusted(countFilter))]);
        return { items: (docs as Doc[]).map(toListing), total };
      },
      async findById(id) {
        const d = await ListingModel.findById(id).lean();
        return d ? toListing(d as Doc) : null;
      },
      async findBySlug(slug) {
        const d = await ListingModel.findOne({ slug }).lean();
        return d ? toListing(d as Doc) : null;
      },
      async create(input) {
        const d = await ListingModel.create({ ...fromListingInput(input), searchText: searchTextOf(input) });
        return toListing(d.toObject());
      },
      async update(id, patch) {
        const cur = await ListingModel.findById(id).lean<Doc>();
        if (!cur) return null;
        const merged = { name: patch.name ?? cur.name, city: patch.city ?? cur.city, tags: patch.tags ?? cur.tags };
        const d = await ListingModel.findByIdAndUpdate(
          id,
          { $set: { ...fromListingInput(patch), searchText: searchTextOf(merged) } },
          { new: true, runValidators: true },
        ).lean();
        return d ? toListing(d as Doc) : null;
      },
      async delete(id) {
        const r = await ListingModel.deleteOne({ _id: id });
        await UserModel.updateMany({}, { $pull: { favorites: oid(id), recent: { listingId: oid(id) } } });
        return r.deletedCount === 1;
      },
      async incrementViews(id) {
        await ListingModel.updateOne({ _id: id }, { $inc: { views: 1 } }, { timestamps: false });
      },
      async setRating(id, rating, reviewCount) {
        await ListingModel.updateOne({ _id: id }, { $set: { rating, reviewCount } }, { timestamps: false });
      },
      async countBy(field, filter = {}) {
        const match: Doc = {};
        if (filter.status) match.status = filter.status;
        if (filter.kind) match.kind = filter.kind;
        match[field] = { $exists: true, $ne: null };
        const rows = await ListingModel.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
        return Object.fromEntries(rows.map((r: Doc) => [r._id, r.n]));
      },
    },
    users: {
      async findById(id) {
        const d = await UserModel.findById(id).lean();
        return d ? toUser(d as Doc) : null;
      },
      async findByFirebaseUid(uid) {
        const d = await UserModel.findOne({ firebaseUid: uid }).lean();
        return d ? toUser(d as Doc) : null;
      },
      async create(u) {
        const d = await UserModel.create({ ...u, favorites: u.favorites.map(oid), recent: [] } as Doc);
        return toUser(d.toObject());
      },
      async update(id, patch) {
        const { favorites, recent, ...safe } = patch;
        const d = await UserModel.findByIdAndUpdate(id, { $set: safe }, { new: true, runValidators: true }).lean();
        return d ? toUser(d as Doc) : null;
      },
      async delete(id) {
        return (await UserModel.deleteOne({ _id: id })).deletedCount === 1;
      },
      async list(q) {
        const f: Doc = {};
        if (q.role) f.role = q.role;
        if (q.status) f.status = q.status;
        if (q.q) {
          const rx = { $regex: escapeRegex(q.q), $options: 'i' };
          f.$or = [{ email: rx }, { displayName: rx }];
        }
        const [docs, total] = await Promise.all([
          UserModel.find(trusted(f)).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
          UserModel.countDocuments(trusted(f)),
        ]);
        return { items: (docs as Doc[]).map(toUser), total };
      },
      async count(filter = {}) {
        return UserModel.countDocuments(filter);
      },
      async addFavorite(id, listingId) {
        await UserModel.updateOne(
          { _id: id },
          { $addToSet: { favorites: oid(listingId) } },
        );
      },
      async removeFavorite(id, listingId) {
        await UserModel.updateOne({ _id: id }, { $pull: { favorites: oid(listingId) } });
      },
      async pushRecent(id, listingId, max) {
        await UserModel.updateOne({ _id: id }, { $pull: { recent: { listingId: oid(listingId) } } });
        await UserModel.updateOne(
          { _id: id },
          { $push: { recent: { $each: [{ listingId: oid(listingId), at: new Date() }], $position: 0, $slice: max } } },
        );
      },
    },
    reviews: {
      async create(r) {
        const d = await ReviewModel.create({ ...r, listingId: oid(r.listingId), userId: oid(r.userId) });
        return toReview(d.toObject());
      },
      async findById(id) {
        const d = await ReviewModel.findById(id).lean();
        return d ? toReview(d as Doc) : null;
      },
      async findByUserAndListing(userId, listingId) {
        const d = await ReviewModel.findOne({ userId: oid(userId), listingId: oid(listingId) }).lean();
        return d ? toReview(d as Doc) : null;
      },
      async list(q) {
        const f: Doc = {};
        if (q.listingId) f.listingId = oid(q.listingId);
        if (q.status) f.status = q.status;
        const [docs, total] = await Promise.all([
          ReviewModel.find(f).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
          ReviewModel.countDocuments(f),
        ]);
        return { items: (docs as Doc[]).map(toReview), total };
      },
      async setStatus(id, status, moderatedBy) {
        const d = await ReviewModel.findByIdAndUpdate(id, { $set: { status, moderatedBy: oid(moderatedBy) } }, { new: true }).lean();
        return d ? toReview(d as Doc) : null;
      },
      async deleteByUser(userId) {
        const docs = await ReviewModel.find({ userId: oid(userId) }, { listingId: 1, rating: 1, status: 1 }).lean<Doc[]>();
        await ReviewModel.deleteMany({ userId: oid(userId) });
        return docs.map((d) => ({ listingId: String(d.listingId), rating: d.rating, status: d.status }));
      },
      async count(filter = {}) {
        return ReviewModel.countDocuments(filter);
      },
    },
    audit: {
      async log(entry) {
        await AuditModel.create(entry);
      },
      async list(q) {
        const [docs, total] = await Promise.all([
          AuditModel.find().sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
          AuditModel.estimatedDocumentCount(),
        ]);
        return { items: (docs as Doc[]).map(toAudit), total };
      },
    },
    async close() {
      await mongoose.disconnect();
    },
  };
}
