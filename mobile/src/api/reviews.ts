import { apiRequest } from './client';
import type { Paginated, Review } from './types';

export const reviewsApi = {
  list: (listingId: string, params: { page?: number; limit?: number } = {}, signal?: AbortSignal) =>
    apiRequest<Paginated<Review>>(`/listings/${encodeURIComponent(listingId)}/reviews`, { query: params, signal, auth: false }),
  create: (listingId: string, body: { rating: number; comment: string }) =>
    apiRequest<Review>(`/listings/${encodeURIComponent(listingId)}/reviews`, { method: 'POST', body, requireAuth: true }),
};
