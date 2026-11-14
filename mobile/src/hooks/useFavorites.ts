import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meApi } from '@/api/me';
import type { Listing } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { useApiLang } from './useApiLang';

export function useFavorites() {
  const { user, status } = useAuth();
  const lang = useApiLang();
  return useQuery({
    queryKey: qk.favorites(user?.uid ?? 'anon', lang),
    queryFn: ({ signal }) => meApi.favorites(signal),
    enabled: status === 'signedIn',
    select: (r) => r.data,
  });
}

export function useIsFavorite(id: string | undefined): boolean {
  const { data } = useFavorites();
  return !!id && !!data?.some((l) => l.id === id);
}

/** Optimistic add/remove with rollback on error. */
export function useToggleFavorite() {
  const { user } = useAuth();
  const lang = useApiLang();
  const qc = useQueryClient();
  const key = qk.favorites(user?.uid ?? 'anon', lang);

  return useMutation({
    mutationFn: ({ listing, favorite }: { listing: Listing; favorite: boolean }) =>
      favorite ? meApi.addFavorite(listing.id) : meApi.removeFavorite(listing.id),
    onMutate: async ({ listing, favorite }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<{ data: Listing[] }>(key);
      const list = previous?.data ?? [];
      qc.setQueryData<{ data: Listing[] }>(key, {
        data: favorite ? [listing, ...list.filter((l) => l.id !== listing.id)] : list.filter((l) => l.id !== listing.id),
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['user', 'favorites'] }),
  });
}
