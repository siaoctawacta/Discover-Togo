/** Types mirroring docs/API.md (public, localized shapes). */
export type Kind = 'place' | 'restaurant' | 'hotel';
export type RegionId = 'maritime' | 'plateaux' | 'centrale' | 'kara' | 'savanes';
export type PlaceCategory = 'nature' | 'culture' | 'historical' | 'beach' | 'city' | 'adventure';
export type Cuisine = 'local' | 'african' | 'continental' | 'fast_food' | 'seafood' | 'cafe';
export type HotelType = 'hotel' | 'lodge' | 'guesthouse' | 'resort';
export type Amenity =
  | 'wifi' | 'pool' | 'parking' | 'restaurant' | 'bar' | 'air_conditioning'
  | 'gym' | 'spa' | 'airport_shuttle' | 'beach_access' | 'breakfast' | 'conference_room';
export type ReviewStatus = 'pending' | 'approved' | 'rejected';
export type Role = 'user' | 'editor' | 'admin';
export type SortOption = 'popular' | 'rating' | 'newest' | 'distance';

export const KINDS: readonly Kind[] = ['place', 'restaurant', 'hotel'];
export const REGIONS: readonly RegionId[] = ['maritime', 'plateaux', 'centrale', 'kara', 'savanes'];
export const PLACE_CATEGORIES: readonly PlaceCategory[] = ['nature', 'culture', 'historical', 'beach', 'city', 'adventure'];
export const CUISINES: readonly Cuisine[] = ['local', 'african', 'continental', 'fast_food', 'seafood', 'cafe'];
export const HOTEL_TYPES: readonly HotelType[] = ['hotel', 'lodge', 'guesthouse', 'resort'];

export interface LatLng { lat: number; lng: number }

export interface Money { amount: number; currency: 'XOF'; note?: string }

export interface Listing {
  id: string;
  kind: Kind;
  slug: string;
  name: string;
  description: string;
  region: RegionId;
  city: string;
  address?: string;
  location: LatLng;
  coverImage: string;
  images: { url: string; alt?: string }[];
  rating: number;
  reviewCount: number;
  tags: string[];
  featured: boolean;
  sponsored: boolean;
  contact?: { phone?: string; email?: string; website?: string; bookingUrl?: string };
  distanceKm?: number;
  category?: PlaceCategory;
  openingHours?: string;
  entryFee?: Money | null;
  cuisine?: Cuisine;
  priceLevel?: 1 | 2 | 3 | 4;
  menu?: { name: string; price: number; currency: 'XOF'; description?: string }[];
  hotelType?: HotelType;
  stars?: number;
  amenities?: Amenity[];
  priceRange?: { min: number; max: number; currency: 'XOF' };
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface Review {
  id: string;
  listingId: string;
  rating: number;
  comment: string;
  author: { displayName: string; photoUrl?: string };
  status: ReviewStatus;
  createdAt: string;
}

export interface MePreferences {
  language: 'en' | 'fr';
  theme: 'system' | 'light' | 'dark';
  interests: PlaceCategory[];
  regions: RegionId[];
}

export interface Me {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  role: Role;
  status: 'active' | 'suspended';
  preferences: MePreferences;
  createdAt: string;
}

export interface MapPin {
  id: string;
  kind: Kind;
  slug: string;
  name: string;
  location: LatLng;
  rating: number;
  coverImage: string;
  category?: PlaceCategory;
  cuisine?: Cuisine;
  hotelType?: HotelType;
}

export interface LabeledOption<T extends string = string> { id: T; label: string }

export interface Meta {
  regions: { id: RegionId; name: string; cities: string[] }[];
  categories: LabeledOption<PlaceCategory>[];
  cuisines: LabeledOption<Cuisine>[];
  hotelTypes: LabeledOption<HotelType>[];
  amenities: LabeledOption<Amenity>[];
}

export interface HomeData {
  hero: Listing[];
  featured: Listing[];
  topRestaurants: Listing[];
  topHotels: Listing[];
  experiences: Listing[];
  categories: { id: PlaceCategory; label: string; count: number }[];
}

export interface SearchResponse {
  query: string;
  results: { places: Listing[]; restaurants: Listing[]; hotels: Listing[] };
  total: number;
}

export interface RecommendationsResponse {
  data: Listing[];
  reason: 'personalized' | 'nearby' | 'popular';
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  | 'PAYLOAD_TOO_LARGE' | 'UNSUPPORTED_MEDIA_TYPE' | 'RATE_LIMITED' | 'INTERNAL'
  // client-side codes
  | 'NETWORK_ERROR' | 'TIMEOUT' | 'BAD_RESPONSE';

export const kindToPath: Record<Kind, 'places' | 'restaurants' | 'hotels'> = {
  place: 'places',
  restaurant: 'restaurants',
  hotel: 'hotels',
};
