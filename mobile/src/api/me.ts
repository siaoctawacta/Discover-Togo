import { apiRequest } from './client';
import type { Listing, Me, MePreferences } from './types';

export interface MeUpdate {
  displayName?: string;
  photoUrl?: string;
  preferences?: Partial<MePreferences>;
}

export const meApi = {
  /** Upsert profile right after Firebase sign-in. */
  session: (body: { displayName?: string; language?: 'en' | 'fr' }) =>
    apiRequest<Me>('/auth/session', { method: 'POST', body, requireAuth: true }),
  get: (signal?: AbortSignal) => apiRequest<Me>('/me', { requireAuth: true, signal }),
  update: (body: MeUpdate) => apiRequest<Me>('/me', { method: 'PATCH', body, requireAuth: true }),
  remove: () => apiRequest<void>('/me', { method: 'DELETE', requireAuth: true }),
  favorites: (signal?: AbortSignal) =>
    apiRequest<{ data: Listing[] }>('/me/favorites', { requireAuth: true, lang: true, signal }),
  addFavorite: (listingId: string) =>
    apiRequest<void>(`/me/favorites/${encodeURIComponent(listingId)}`, { method: 'PUT', requireAuth: true }),
  removeFavorite: (listingId: string) =>
    apiRequest<void>(`/me/favorites/${encodeURIComponent(listingId)}`, { method: 'DELETE', requireAuth: true }),
  recent: (signal?: AbortSignal) =>
    apiRequest<{ data: Listing[] }>('/me/recent', { requireAuth: true, lang: true, signal }),
  pushToken: (body: { token: string; platform: 'ios' | 'android' }) =>
    apiRequest<void>('/me/push-token', { method: 'POST', body, requireAuth: true }),
};
