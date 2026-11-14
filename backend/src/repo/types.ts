import type {
  AuditRecord,
  Cuisine,
  GeoPoint,
  HotelType,
  Kind,
  ListingInput,
  ListingRecord,
  ListingStatus,
  PlaceCategory,
  RegionId,
  ReviewRecord,
  ReviewStatus,
  Role,
  UserRecord,
} from '../domain/types.js';

export interface Page<T> {
  items: T[];
  total: number;
}

export interface ListingQuery {
  kind?: Kind;
  kinds?: Kind[];
  status?: ListingStatus | 'any';
  region?: RegionId;
  city?: string;
  category?: PlaceCategory;
  categories?: PlaceCategory[];
  cuisine?: Cuisine;
  priceLevels?: number[];
  hotelType?: HotelType;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  q?: string;
  featured?: boolean;
  ids?: string[];
  excludeIds?: string[];
  bbox?: [number, number, number, number]; // minLng,minLat,maxLng,maxLat
  near?: GeoPoint;
  sort?: 'popular' | 'rating' | 'newest' | 'distance';
  page?: number;
  limit?: number;
}

export interface UserQuery {
  q?: string;
  role?: Role;
  status?: 'active' | 'suspended';
  page: number;
  limit: number;
}

/**
 * Persistence port. Two adapters implement it: MongoDB (production) and an
 * in-memory store (demo mode + tests). Business rules live in services, not here.
 */
export interface Repository {
  listings: {
    find(q: ListingQuery): Promise<Page<ListingRecord>>;
    findById(id: string): Promise<ListingRecord | null>;
    findBySlug(slug: string): Promise<ListingRecord | null>;
    create(input: ListingInput): Promise<ListingRecord>;
    update(id: string, patch: Partial<ListingInput>): Promise<ListingRecord | null>;
    delete(id: string): Promise<boolean>;
    incrementViews(id: string): Promise<void>;
    setRating(id: string, rating: number, reviewCount: number): Promise<void>;
    countBy(field: 'kind' | 'category', filter?: { status?: ListingStatus; kind?: Kind }): Promise<Record<string, number>>;
  };
  users: {
    findById(id: string): Promise<UserRecord | null>;
    findByFirebaseUid(uid: string): Promise<UserRecord | null>;
    create(u: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
    update(id: string, patch: Partial<Omit<UserRecord, 'id' | 'firebaseUid' | 'createdAt'>>): Promise<UserRecord | null>;
    delete(id: string): Promise<boolean>;
    list(q: UserQuery): Promise<Page<UserRecord>>;
    count(filter?: { role?: Role; status?: 'active' | 'suspended' }): Promise<number>;
    addFavorite(id: string, listingId: string): Promise<void>;
    removeFavorite(id: string, listingId: string): Promise<void>;
    pushRecent(id: string, listingId: string, max: number): Promise<void>;
  };
  reviews: {
    create(r: Omit<ReviewRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReviewRecord>;
    findById(id: string): Promise<ReviewRecord | null>;
    findByUserAndListing(userId: string, listingId: string): Promise<ReviewRecord | null>;
    list(q: { listingId?: string; status?: ReviewStatus; page: number; limit: number }): Promise<Page<ReviewRecord>>;
    setStatus(id: string, status: ReviewStatus, moderatedBy: string): Promise<ReviewRecord | null>;
    /** Deletes all of a user's reviews and returns what was removed (to fix ratings). */
    deleteByUser(userId: string): Promise<Pick<ReviewRecord, 'listingId' | 'rating' | 'status'>[]>;
    count(filter?: { status?: ReviewStatus }): Promise<number>;
  };
  audit: {
    log(entry: Omit<AuditRecord, 'id' | 'createdAt'>): Promise<void>;
    list(q: { page: number; limit: number }): Promise<Page<AuditRecord>>;
  };
  close(): Promise<void>;
}
