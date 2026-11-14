import { useQuery } from '@tanstack/react-query';
import { mapApi } from '@/api/map';
import type { Kind } from '@/api/types';
import { qk } from '@/lib/queryClient';
import { useApiLang } from './useApiLang';

export function useMapPins(kinds: Kind[]) {
  const lang = useApiLang();
  const sorted = [...kinds].sort();
  return useQuery({
    queryKey: qk.map(sorted.join(','), lang),
    queryFn: ({ signal }) => mapApi.pins({ kinds: sorted.length ? sorted : undefined }, signal),
    select: (r) => r.data,
  });
}
