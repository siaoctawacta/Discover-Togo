import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { meApi, type MeUpdate } from '@/api/me';
import type { Listing, Me } from '@/api/types';
import { useAuth } from '@/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { useApiLang } from './useApiLang';

export function useMe() {
  const { user, status } = useAuth();
  return useQuery({
    queryKey: qk.me(user?.uid ?? 'anon'),
    queryFn: ({ signal }) => meApi.get(signal),
    enabled: status === 'signedIn',
  });
}

export function useUpdateMe() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: MeUpdate) => meApi.update(body),
    onSuccess: (me: Me) => qc.setQueryData(qk.me(user?.uid ?? 'anon'), me),
  });
}

export function useRecent() {
  const { user, status } = useAuth();
  const lang = useApiLang();
  return useQuery({
    queryKey: qk.recent(user?.uid ?? 'anon', lang),
    queryFn: ({ signal }) => meApi.recent(signal),
    enabled: status === 'signedIn',
    select: (r): Listing[] => r.data,
  });
}
