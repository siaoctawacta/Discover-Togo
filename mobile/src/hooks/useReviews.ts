import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewsApi } from '@/api/reviews';
import { qk } from '@/lib/queryClient';
import { isObjectId } from '@/lib/validators';

export function useReviews(listingId: string | undefined, pageSize = 10) {
  return useInfiniteQuery({
    queryKey: [...qk.reviews(listingId ?? 'none'), pageSize],
    enabled: isObjectId(listingId),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => reviewsApi.list(listingId as string, { page: pageParam, limit: pageSize }, signal),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    select: (d) => ({ items: d.pages.flatMap((p) => p.data), total: d.pages[0]?.total ?? 0 }),
  });
}

export function useCreateReview(listingId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { rating: number; comment: string }) => reviewsApi.create(listingId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reviews(listingId) }),
  });
}
