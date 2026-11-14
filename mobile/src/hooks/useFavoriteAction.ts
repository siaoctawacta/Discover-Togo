import { router } from 'expo-router';
import { useCallback } from 'react';
import type { Listing } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { useIsFavorite, useToggleFavorite } from './useFavorites';

/** Heart button logic: optimistic toggle when signed in, otherwise prompt login. */
export function useFavoriteAction(listing: Listing | undefined) {
  const { status } = useAuth();
  const isFavorite = useIsFavorite(listing?.id);
  const mutation = useToggleFavorite();
  const toggle = useCallback(() => {
    if (!listing) return;
    if (status !== 'signedIn') {
      router.push({ pathname: '/auth/login', params: { reason: 'favorite' } });
      return;
    }
    mutation.mutate({ listing, favorite: !isFavorite });
  }, [listing, status, isFavorite, mutation]);
  return { isFavorite, toggle, pending: mutation.isPending };
}
