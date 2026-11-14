import { apiRequest } from './client';
import type { HomeData, Meta, RecommendationsResponse } from './types';

export const homeApi = {
  get: (signal?: AbortSignal) => apiRequest<HomeData>('/home', { lang: true, signal }),
  meta: (signal?: AbortSignal) => apiRequest<Meta>('/meta', { lang: true, signal, auth: false }),
  recommendations: (params: { lat?: number; lng?: number; limit?: number }, signal?: AbortSignal) =>
    apiRequest<RecommendationsResponse>('/recommendations', { query: params, lang: true, signal }),
};
