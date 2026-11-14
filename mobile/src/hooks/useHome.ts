import { useQuery } from '@tanstack/react-query';
import { homeApi } from '@/api/home';
import { useAuth } from '@/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { useLocationStore } from '@/store/location';
import { useApiLang } from './useApiLang';

export function useHome() {
  const lang = useApiLang();
  return useQuery({ queryKey: qk.home(lang), queryFn: ({ signal }) => homeApi.get(signal) });
}

export function useMeta() {
  const lang = useApiLang();
  return useQuery({
    queryKey: qk.meta(lang),
    queryFn: ({ signal }) => homeApi.meta(signal),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useRecommendations(limit = 10) {
  const lang = useApiLang();
  const coords = useLocationStore((s) => s.coords);
  const { user } = useAuth();
  const coordKey = coords ? `${coords.lat},${coords.lng}` : 'none';
  return useQuery({
    queryKey: qk.recommendations(lang, coordKey, user?.uid ?? 'anon'),
    queryFn: ({ signal }) => homeApi.recommendations({ lat: coords?.lat, lng: coords?.lng, limit }, signal),
  });
}
