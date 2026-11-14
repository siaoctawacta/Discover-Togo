import type { Kind } from './types';

export const KIND_META: Record<Kind, { label: string; plural: string; path: string }> = {
  place: { label: 'Place', plural: 'Places', path: 'places' },
  restaurant: { label: 'Restaurant', plural: 'Restaurants', path: 'restaurants' },
  hotel: { label: 'Hotel', plural: 'Hotels', path: 'hotels' },
};
