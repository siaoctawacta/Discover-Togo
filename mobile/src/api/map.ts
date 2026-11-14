import { apiRequest } from './client';
import type { Kind, MapPin } from './types';

export type BBox = [minLng: number, minLat: number, maxLng: number, maxLat: number];

export const mapApi = {
  pins: (params: { kinds?: Kind[]; bbox?: BBox }, signal?: AbortSignal) =>
    apiRequest<{ data: MapPin[] }>('/map', {
      query: { kinds: params.kinds, bbox: params.bbox?.map((n) => n.toFixed(5)) },
      lang: true,
      signal,
    }),
};
