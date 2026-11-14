import { api } from './api';
import type {
  AdminListing, AdminReview, AdminStats, AuditLog, Kind, ListingInput, ListingStatus,
  Me, Meta, Paginated, Review, ReviewStatus, Role, UserStatus,
} from './types';

export const PAGE_SIZE = 20;

export const endpoints = {
  me: (token?: string) => api<Me>('/me', { token, silent: Boolean(token) }),
  meta: (lang: 'en' | 'fr' = 'en') => api<Meta>('/meta', { query: { lang } }),
  stats: () => api<AdminStats>('/admin/stats'),

  listings: (q: { kind: Kind; status?: ListingStatus | ''; q?: string; page: number; limit?: number }) =>
    api<Paginated<AdminListing>>('/admin/listings', { query: { limit: PAGE_SIZE, ...q } }),
  listing: (id: string) => api<AdminListing>(`/admin/listings/${encodeURIComponent(id)}`),
  createListing: (body: ListingInput) => api<AdminListing>('/admin/listings', { method: 'POST', body }),
  updateListing: (id: string, body: Partial<ListingInput>) =>
    api<AdminListing>(`/admin/listings/${encodeURIComponent(id)}`, { method: 'PATCH', body }),
  deleteListing: (id: string) => api<void>(`/admin/listings/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  reviews: (q: { status: ReviewStatus; page: number; limit?: number }) =>
    api<Paginated<AdminReview>>('/admin/reviews', { query: { limit: PAGE_SIZE, ...q } }),
  moderateReview: (id: string, status: 'approved' | 'rejected') =>
    api<Review>(`/admin/reviews/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } }),

  users: (q: { q?: string; role?: Role | ''; status?: UserStatus | ''; page: number; limit?: number }) =>
    api<Paginated<Me>>('/admin/users', { query: { limit: PAGE_SIZE, ...q } }),
  updateUser: (id: string, body: { role?: Role; status?: UserStatus }) =>
    api<Me>(`/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body }),

  auditLogs: (q: { page: number; limit?: number }) =>
    api<Paginated<AuditLog>>('/admin/audit-logs', { query: { limit: PAGE_SIZE, ...q } }),
};
