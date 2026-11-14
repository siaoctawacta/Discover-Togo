import { useQuery } from '@tanstack/react-query';
import { searchApi } from '@/api/search';
import { qk } from '@/lib/queryClient';
import { useApiLang } from './useApiLang';

export function useSearch(q: string) {
  const lang = useApiLang();
  const term = q.trim();
  return useQuery({
    queryKey: qk.search(term.toLowerCase(), lang),
    queryFn: ({ signal }) => searchApi.search(term, { limit: 10 }, signal),
    enabled: term.length >= 2 && term.length <= 80,
    staleTime: 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
