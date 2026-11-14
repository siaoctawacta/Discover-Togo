import type { Href } from 'expo-router';
import type { Kind } from '@/api/types';

export function listingHref(item: { kind: Kind; id: string }): Href {
  return { pathname: '/listing/[kind]/[id]', params: { kind: item.kind, id: item.id } };
}

export function kindIcon(kind: Kind): 'leaf' | 'restaurant' | 'bed' {
  return kind === 'place' ? 'leaf' : kind === 'restaurant' ? 'restaurant' : 'bed';
}
