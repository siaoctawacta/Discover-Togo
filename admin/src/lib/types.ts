// Types mirror docs/API.md (v1). Keep in sync with the contract.

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

export const USER_STATUSES = ['active', 'suspended'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface Localized {
  en: string;
  fr: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

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

export interface AdminListing {
  id: string;
  kind: Kind;
  slug: string;
  name: Localized;
  description: Localized;
  region: RegionId;
  city: string;
  address?: string;
  location: { lat: number; lng: number };
  coverImage: string;
  images: { url: string; alt?: string }[];
  rating: number;
  reviewCount: number;
  tags: string[];
  featured: boolean;
  sponsored: boolean;
  contact?: Contact;
  category?: PlaceCategory;
  openingHours?: Localized;
  entryFee?: { amount: number; currency: 'XOF'; note?: string } | null;
  cuisine?: Cuisine;
  priceLevel?: 1 | 2 | 3 | 4;
  menu?: MenuItem[];
  hotelType?: HotelType;
  stars?: number;
  amenities?: Amenity[];
  priceRange?: { min: number; max: number; currency: 'XOF' };
  status: ListingStatus;
  sponsoredUntil?: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /admin/listings. coverImage/sponsored are derived server-side (images[0], sponsoredUntil). */
export type ListingInput = Omit<
  AdminListing,
  'id' | 'rating' | 'reviewCount' | 'views' | 'createdAt' | 'updatedAt' | 'sponsored' | 'coverImage'
>;

export interface Review {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  author: { displayName: string; photoUrl?: string };
  status: ReviewStatus;
  createdAt: string;
}

export interface AdminReview extends Review {
  listingName: string;
  userEmail: string;
}

export interface Me {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: Role;
  status: UserStatus;
  preferences: {
    language: 'en' | 'fr';
    theme: 'system' | 'light' | 'dark';
    interests: PlaceCategory[];
    regions: RegionId[];
  };
  createdAt: string;
}

export interface AdminStats {
  listings: Record<Kind, number>;
  users: number;
  pendingReviews: number;
  topViewed: AdminListing[];
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  ip: string;
  createdAt: string;
}

export interface EnumOption {
  id: string;
  label: string;
}

export interface Meta {
  regions: { id: RegionId; name: string; cities: string[] }[];
  categories: EnumOption[];
  cuisines: EnumOption[];
  hotelTypes: EnumOption[];
  amenities: EnumOption[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId?: string;
    details?: unknown[];
  };
}
