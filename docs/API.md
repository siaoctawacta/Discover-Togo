# Discover Togo — REST API Contract (v1)

Base URL: `https://api.discovertogo.app/api/v1` (local: `http://localhost:4000/api/v1`).
All bodies are JSON (`Content-Type: application/json`, max 20 KB). All responses are JSON.

## Conventions

| Topic | Rule |
|---|---|
| Auth | `Authorization: Bearer <Firebase ID token>`. In local dev only (`AUTH_MODE=dev`), `Bearer dev:<uid>:<role>` is accepted (`role` = `user` \| `editor` \| `admin`). The server refuses to boot with `AUTH_MODE=dev` in production. |
| Language | `?lang=en\|fr` (falls back to `Accept-Language`, then `en`). Public endpoints return localized strings. Admin endpoints return raw `{ en, fr }` objects. |
| Pagination | `?page=1&limit=20` (limit max 50). Response: `{ data, page, limit, total, hasMore }` |
| Errors | `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "requestId": "…", "details": [...] } }` |
| Error codes | `VALIDATION_ERROR` 400, `UNAUTHENTICATED` 401, `FORBIDDEN` 403, `NOT_FOUND` 404, `CONFLICT` 409, `PAYLOAD_TOO_LARGE` 413, `UNSUPPORTED_MEDIA_TYPE` 415, `RATE_LIMITED` 429, `INTERNAL` 500 |
| IDs | 24-hex-char strings. Detail endpoints accept an id **or** a slug. |
| Unknown query/body keys | Rejected with `VALIDATION_ERROR` (strict schemas). |

## Enums

```ts
type Kind = 'place' | 'restaurant' | 'hotel';
type RegionId = 'maritime' | 'plateaux' | 'centrale' | 'kara' | 'savanes';
type PlaceCategory = 'nature' | 'culture' | 'historical' | 'beach' | 'city' | 'adventure';
type Cuisine = 'local' | 'african' | 'continental' | 'fast_food' | 'seafood' | 'cafe';
type HotelType = 'hotel' | 'lodge' | 'guesthouse' | 'resort';
type Amenity = 'wifi' | 'pool' | 'parking' | 'restaurant' | 'bar' | 'air_conditioning'
  | 'gym' | 'spa' | 'airport_shuttle' | 'beach_access' | 'breakfast' | 'conference_room';
type ListingStatus = 'draft' | 'published' | 'archived';
type ReviewStatus = 'pending' | 'approved' | 'rejected';
type Role = 'user' | 'editor' | 'admin';
```

## Shapes

```ts
interface Listing {                 // public, localized
  id: string; kind: Kind; slug: string;
  name: string; description: string;
  region: RegionId; city: string; address?: string;
  location: { lat: number; lng: number };
  coverImage: string;               // https URL
  images: { url: string; alt?: string }[];
  rating: number;                   // 0..5, 1 decimal
  reviewCount: number;
  tags: string[];
  featured: boolean;
  sponsored: boolean;               // paid placement (monetization) — show "Sponsored" badge
  contact?: { phone?: string; email?: string; website?: string; bookingUrl?: string };
  distanceKm?: number;              // only when lat/lng given
  // kind === 'place'
  category?: PlaceCategory;
  openingHours?: string;            // localized free text, e.g. "Daily 08:00–18:00"
  entryFee?: { amount: number; currency: 'XOF'; note?: string } | null; // null = free
  // kind === 'restaurant'
  cuisine?: Cuisine;
  priceLevel?: 1 | 2 | 3 | 4;
  menu?: { name: string; price: number; currency: 'XOF'; description?: string }[];
  // kind === 'hotel'
  hotelType?: HotelType;
  stars?: number;                   // 1..5
  amenities?: Amenity[];
  priceRange?: { min: number; max: number; currency: 'XOF' };  // per night
  updatedAt: string;                // ISO
}

interface AdminListing extends Omit<Listing,'name'|'description'|'openingHours'|'distanceKm'> {
  name: { en: string; fr: string };
  description: { en: string; fr: string };
  openingHours?: { en: string; fr: string };
  status: ListingStatus;
  sponsoredUntil?: string | null;
  views: number;
  createdAt: string;
}

interface Review {
  id: string; listingId: string; rating: number; comment: string;
  author: { displayName: string; photoUrl?: string };
  status: ReviewStatus;             // public endpoints only ever return 'approved'
  createdAt: string;
}

interface Me {
  id: string; email: string; displayName: string; photoUrl?: string;
  role: Role; status: 'active' | 'suspended';
  preferences: { language: 'en' | 'fr'; theme: 'system' | 'light' | 'dark';
                 interests: PlaceCategory[]; regions: RegionId[] };
  createdAt: string;
}

interface MapPin {
  id: string; kind: Kind; slug: string; name: string;
  location: { lat: number; lng: number }; rating: number; coverImage: string;
  category?: PlaceCategory; cuisine?: Cuisine; hotelType?: HotelType;
}
```

## Public endpoints (auth optional)

| Method | Path | Query / Body | Response |
|---|---|---|---|
| GET | `/health` | – | `{ status: 'ok' }` |
| GET | `/meta` | `lang` | `{ regions: {id,name,cities:string[]}[], categories, cuisines, hotelTypes, amenities }` (each enum list = `{id,label}[]`) |
| GET | `/home` | `lang` | `{ hero: Listing[], featured: Listing[], topRestaurants: Listing[], topHotels: Listing[], experiences: Listing[], categories: {id,label,count}[] }` |
| GET | `/places` | `region, city, category, q, sort=popular\|rating\|newest\|distance, lat, lng, page, limit, lang` | `Paginated<Listing>` |
| GET | `/places/:idOrSlug` | `lang` | `Listing` (records "recently viewed" if authenticated) |
| GET | `/restaurants` | `region, city, cuisine, priceLevel (e.g. "1,2"), minRating, q, sort, lat, lng, page, limit, lang` | `Paginated<Listing>` |
| GET | `/restaurants/:idOrSlug` | `lang` | `Listing` |
| GET | `/hotels` | `region, city, hotelType, minPrice, maxPrice, minRating, q, sort, lat, lng, page, limit, lang` | `Paginated<Listing>` |
| GET | `/hotels/:idOrSlug` | `lang` | `Listing` |
| GET | `/search` | `q` (2–80 chars), `kinds=place,restaurant,hotel`, `limit` (≤20 per kind), `lang` | `{ query, results: { places: Listing[], restaurants: Listing[], hotels: Listing[] }, total }` |
| GET | `/recommendations` | `lat, lng, limit (≤20), lang` | `{ data: Listing[], reason: 'personalized'\|'nearby'\|'popular' }` |
| GET | `/map` | `kinds, bbox=minLng,minLat,maxLng,maxLat, lang` | `{ data: MapPin[] }` (max 500) |
| GET | `/listings/:id/reviews` | `page, limit` | `Paginated<Review>` |

## Authenticated endpoints

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/session` | `{ displayName?, language? }` | `Me` — upserts profile after Firebase sign-in |
| GET | `/me` | – | `Me` |
| PATCH | `/me` | `{ displayName?, photoUrl?, preferences?: Partial<Me['preferences']> }` | `Me` |
| DELETE | `/me` | – | `204` (deletes profile, favorites, reviews) |
| GET | `/me/favorites` | `lang` | `{ data: Listing[] }` |
| PUT | `/me/favorites/:listingId` | – | `204` |
| DELETE | `/me/favorites/:listingId` | – | `204` |
| GET | `/me/recent` | `lang` | `{ data: Listing[] }` (max 20, newest first) |
| POST | `/me/push-token` | `{ token, platform: 'ios'\|'android' }` | `204` |
| POST | `/listings/:id/reviews` | `{ rating: 1..5, comment: 10..1000 chars }` | `201 Review` with `status: 'pending'` (one review per user per listing → `409`) |

## Admin endpoints (`editor` or `admin`; ★ = `admin` only)

| Method | Path | Body / Query | Response |
|---|---|---|---|
| GET | `/admin/stats` | – | `{ listings: {place,restaurant,hotel}, users, pendingReviews, topViewed: AdminListing[] }` |
| GET | `/admin/listings` | `kind, status, q, page, limit` | `Paginated<AdminListing>` |
| POST | `/admin/listings` | `AdminListing` input (no id/rating/views/timestamps) | `201 AdminListing` |
| GET | `/admin/listings/:id` | – | `AdminListing` |
| PATCH | `/admin/listings/:id` | partial input | `AdminListing` |
| DELETE | `/admin/listings/:id` | – | `204` (★) |
| GET | `/admin/reviews` | `status=pending\|approved\|rejected, page, limit` | `Paginated<Review & { listingName: string; userEmail: string }>` |
| PATCH | `/admin/reviews/:id` | `{ status: 'approved'\|'rejected' }` | `Review` |
| GET | `/admin/users` ★ | `q, role, status, page, limit` | `Paginated<Me>` |
| PATCH | `/admin/users/:id` ★ | `{ role?, status? }` (cannot change own role/status) | `Me` |
| GET | `/admin/audit-logs` ★ | `page, limit` | `Paginated<{ id, actorId, actorEmail, action, targetType, targetId, ip, createdAt }>` |

Image URLs must be `https://` and on an allow-listed host (`IMAGE_HOSTS` env, default: `firebasestorage.googleapis.com, storage.googleapis.com, images.unsplash.com, upload.wikimedia.org`).
