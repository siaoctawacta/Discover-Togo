export const KINDS = ['place', 'restaurant', 'hotel'] as const;
export type Kind = (typeof KINDS)[number];

export const REGION_IDS = ['maritime', 'plateaux', 'centrale', 'kara', 'savanes'] as const;
export type RegionId = (typeof REGION_IDS)[number];

export const PLACE_CATEGORIES = ['nature', 'culture', 'historical', 'beach', 'city', 'adventure'] as const;
export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const CUISINES = ['local', 'african', 'continental', 'fast_food', 'seafood', 'cafe'] as const;
export type Cuisine = (typeof CUISINES)[number];

export const HOTEL_TYPES = ['hotel', 'lodge', 'guesthouse', 'resort'] as const;
export type HotelType = (typeof HOTEL_TYPES)[number];

export const AMENITIES = [
  'wifi', 'pool', 'parking', 'restaurant', 'bar', 'air_conditioning',
  'gym', 'spa', 'airport_shuttle', 'beach_access', 'breakfast', 'conference_room',
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const ROLES = ['user', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];

export type L10n = { en: string; fr: string };
export type GeoPoint = { lat: number; lng: number };

export interface Contact {
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
}

export interface MenuItem {
  name: string;
  price: number;
  currency: 'XOF';
  description?: string;
}

/** Canonical stored listing (all kinds share one collection). */
export interface ListingRecord {
  id: string;
  kind: Kind;
  slug: string;
  name: L10n;
  description: L10n;
  region: RegionId;
  city: string;
  address?: string;
  location: GeoPoint;
  images: { url: string; alt?: string }[];
  rating: number;
  reviewCount: number;
  tags: string[];
  featured: boolean;
  sponsoredUntil: Date | null;
  status: ListingStatus;
  views: number;
  contact?: Contact;
  // place
  category?: PlaceCategory;
  openingHours?: L10n;
  entryFee?: { amount: number; currency: 'XOF'; note?: string } | null;
  // restaurant
  cuisine?: Cuisine;
  priceLevel?: 1 | 2 | 3 | 4;
  menu?: MenuItem[];
  // hotel
  hotelType?: HotelType;
  stars?: number;
  amenities?: Amenity[];
  priceRange?: { min: number; max: number; currency: 'XOF' };
  createdAt: Date;
  updatedAt: Date;
}

export type ListingInput = Omit<
  ListingRecord,
  'id' | 'rating' | 'reviewCount' | 'views' | 'createdAt' | 'updatedAt'
>;

export interface Preferences {
  language: Lang;
  theme: 'system' | 'light' | 'dark';
  interests: PlaceCategory[];
  regions: RegionId[];
}

export interface UserRecord {
  id: string;
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoUrl?: string;
  role: Role;
  status: 'active' | 'suspended';
  preferences: Preferences;
  favorites: string[]; // listing ids, newest first
  recent: { listingId: string; at: Date }[];
  pushTokens: { token: string; platform: 'ios' | 'android'; updatedAt: Date }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewRecord {
  id: string;
  listingId: string;
  userId: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  moderatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: 'listing' | 'review' | 'user';
  targetId: string;
  ip: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
}

export const DEFAULT_PREFERENCES: Preferences = {
  language: 'en',
  theme: 'system',
  interests: [],
  regions: [],
};
