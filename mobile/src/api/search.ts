import { apiRequest } from './client';
import type { Kind, SearchResponse } from './types';

export const searchApi = {
  search: (q: string, opts: { kinds?: Kind[]; limit?: number } = {}, signal?: AbortSignal) =>
    apiRequest<SearchResponse>('/search', {
      query: { q: q.trim().slice(0, 80), kinds: opts.kinds, limit: opts.limit },
      lang: true,
      signal,
    }),
};
