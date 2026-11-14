import mongoose, { Schema } from 'mongoose';
import {
  AMENITIES, CUISINES, HOTEL_TYPES, KINDS, LANGS, LISTING_STATUSES, PLACE_CATEGORIES,
  REGION_IDS, REVIEW_STATUSES, ROLES,
} from '../../domain/types.js';

// Reject unknown fields at the ODM level too (defence in depth against mass assignment).
mongoose.set('strict', 'throw');
// Casts query filter values so objects like {$ne: null} can't sneak into equality matches.
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

const L10n = new Schema({ en: { type: String, required: true, maxlength: 5000 }, fr: { type: String, required: true, maxlength: 5000 } }, { _id: false });

const sub = (def: Record<string, unknown>) => new Schema(def, { _id: false });
const Image = sub({ url: { type: String, required: true, maxlength: 500 }, alt: { type: String, maxlength: 140 } });
const Contact = sub({ phone: String, email: String, website: String, bookingUrl: String });
const Money = sub({ amount: Number, currency: { type: String, enum: ['XOF'] }, note: String });
const MenuItem = sub({ name: String, price: Number, currency: { type: String, enum: ['XOF'] }, description: String });
const PriceRange = sub({ min: Number, max: Number, currency: { type: String, enum: ['XOF'] } });

const ListingSchema = new Schema(
  {
    kind: { type: String, enum: KINDS, required: true, index: true },
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    name: { type: L10n, required: true },
    description: { type: L10n, required: true },
    region: { type: String, enum: REGION_IDS, required: true },
    city: { type: String, required: true, maxlength: 60 },
    cityFolded: { type: String, required: true, maxlength: 60 },
    address: { type: String, maxlength: 200 },
    /** GeoJSON [lng, lat] for 2dsphere queries */
    geo: {
      type: sub({ type: { type: String, enum: ['Point'], required: true }, coordinates: { type: [Number], required: true } }),
      required: true,
    },
    images: { type: [Image], required: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    tags: [{ type: String, maxlength: 30 }],
    searchText: { type: String, maxlength: 2000 }, // folded name/city/tags for accent-insensitive search
    featured: { type: Boolean, default: false },
    sponsoredUntil: { type: Date, default: null },
    status: { type: String, enum: LISTING_STATUSES, default: 'draft' },
    views: { type: Number, default: 0, min: 0 },
    contact: { type: Contact, default: undefined },
    category: { type: String, enum: PLACE_CATEGORIES },
    openingHours: { type: L10n },
    entryFee: { type: Money, default: undefined },
    cuisine: { type: String, enum: CUISINES },
    priceLevel: { type: Number, min: 1, max: 4 },
    menu: { type: [MenuItem], default: undefined },
    hotelType: { type: String, enum: HOTEL_TYPES },
    stars: { type: Number, min: 1, max: 5 },
    amenities: { type: [{ type: String, enum: AMENITIES }], default: undefined },
    priceRange: { type: PriceRange, default: undefined },
  },
  { timestamps: true },
);
ListingSchema.index({ geo: '2dsphere' });
ListingSchema.index({ status: 1, kind: 1, views: -1 });
ListingSchema.index({ status: 1, kind: 1, rating: -1 });
ListingSchema.index({ status: 1, kind: 1, region: 1, category: 1 });
ListingSchema.index({ status: 1, kind: 1, cityFolded: 1, cuisine: 1 });
ListingSchema.index({ status: 1, featured: 1 });

const UserSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, maxlength: 128 },
    email: { type: String, required: true, maxlength: 254, index: true },
    emailVerified: { type: Boolean, default: false },
    displayName: { type: String, maxlength: 60, default: '' },
    photoUrl: { type: String, maxlength: 500 },
    role: { type: String, enum: ROLES, default: 'user', index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    preferences: {
      type: sub({
        language: { type: String, enum: LANGS, default: 'en' },
        theme: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
        interests: [{ type: String, enum: PLACE_CATEGORIES }],
        regions: [{ type: String, enum: REGION_IDS }],
      }),
      default: () => ({}),
    },
    favorites: [{ type: Schema.Types.ObjectId, ref: 'Listing' }],
    recent: [sub({ listingId: { type: Schema.Types.ObjectId, ref: 'Listing' }, at: Date })],
    pushTokens: [sub({ token: { type: String, maxlength: 300 }, platform: { type: String, enum: ['ios', 'android'] }, updatedAt: Date })],
  },
  { timestamps: true },
);

const ReviewSchema = new Schema(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: REVIEW_STATUSES, default: 'pending' },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);
ReviewSchema.index({ listingId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ listingId: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, createdAt: -1 });

const AuditSchema = new Schema(
  {
    actorId: { type: String, required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true },
    targetType: { type: String, enum: ['listing', 'review', 'user'], required: true },
    targetId: { type: String, required: true },
    ip: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
AuditSchema.index({ createdAt: -1 });
// Keep audit logs for 2 years.
AuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 730, name: 'audit_ttl' });

export const ListingModel = mongoose.model('Listing', ListingSchema);
export const UserModel = mongoose.model('User', UserSchema);
export const ReviewModel = mongoose.model('Review', ReviewSchema);
export const AuditModel = mongoose.model('AuditLog', AuditSchema);
