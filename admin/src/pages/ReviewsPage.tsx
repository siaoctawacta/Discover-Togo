import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { useToast } from '../components/Toast';
import { Badge, EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../components/ui';
import { errorMessage } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtDateTime } from '../lib/format';
import { REVIEW_STATUSES, type AdminReview, type Paginated, type ReviewStatus } from '../lib/types';

const TAB_LABEL: Record<ReviewStatus, string> = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

function Stars({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="stars" aria-label={`${r} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(r)}</span>
      <span aria-hidden="true" className="stars-off">{'★'.repeat(5 - r)}</span>
    </span>
  );
}

type Ctx = { key: readonly unknown[]; prev: Paginated<AdminReview> | undefined };

export function ReviewsPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('status');
  const tab: ReviewStatus = (REVIEW_STATUSES as readonly string[]).includes(rawTab ?? '') ? (rawTab as ReviewStatus) : 'pending';
  const pageNum = Number(params.get('page'));
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  const key = ['reviews', tab, page] as const;

  const list = useQuery({
    queryKey: key,
    queryFn: () => endpoints.reviews({ status: tab, page }),
    placeholderData: keepPreviousData,
  });

  const moderate = useMutation<unknown, unknown, { review: AdminReview; status: 'approved' | 'rejected' }, Ctx>({
    mutationFn: ({ review, status }) => endpoints.moderateReview(review.id, status),
    // Optimistic update: the review leaves the current tab immediately; rolled back on error.
    onMutate: async ({ review }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Paginated<AdminReview>>(key);
      if (prev) {
        qc.setQueryData<Paginated<AdminReview>>(key, {
          ...prev,
          data: prev.data.filter((r) => r.id !== review.id),
          total: Math.max(0, prev.total - 1),
        });
      }
      return { key, prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      toast.show(errorMessage(e), 'error');
    },
    onSuccess: (_d, { status }) => toast.show(status === 'approved' ? 'Review approved' : 'Review rejected', 'success'),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['reviews'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  function setTab(t: ReviewStatus) {
    setParams({ status: t });
  }

  return (
    <>
      <PageHeader title="Reviews" subtitle="Moderate user reviews before they appear in the app" />
      <div className="tabs" role="tablist" aria-label="Review status">
        {REVIEW_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={tab === s}
            className={`tab${tab === s ? ' active' : ''}`}
            onClick={() => setTab(s)}
          >
            {TAB_LABEL[s]}
            {tab === s && list.data && <span className="tab-count">{list.data.total}</span>}
          </button>
        ))}
      </div>

      <section className="card card-flush" role="tabpanel">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data.data.length === 0 ? (
          <EmptyState>{tab === 'pending' ? 'All caught up — no reviews waiting for moderation.' : `No ${tab} reviews.`}</EmptyState>
        ) : (
          <>
            <ul className="review-list">
              {list.data.data.map((r) => (
                <li key={r.id} className="review">
                  <div className="review-head">
                    <div>
                      <span className="review-listing">{r.listingName}</span>
                      <span className="muted small block">
                        {r.author.displayName} · {r.userEmail} · {fmtDateTime(r.createdAt)}
                      </span>
                    </div>
                    <Stars rating={r.rating} />
                  </div>
                  {/* User-generated text: rendered as plain text only. */}
                  <p className="review-comment">{r.comment}</p>
                  <div className="review-actions">
                    <Badge tone={r.status}>{r.status}</Badge>
                    <span className="grow" />
                    {r.status !== 'rejected' && (
                      <button
                        type="button"
                        className="btn btn-danger-ghost btn-sm"
                        disabled={moderate.isPending && moderate.variables?.review.id === r.id}
                        onClick={() => moderate.mutate({ review: r, status: 'rejected' })}
                      >
                        Reject
                      </button>
                    )}
                    {r.status !== 'approved' && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={moderate.isPending && moderate.variables?.review.id === r.id}
                        onClick={() => moderate.mutate({ review: r, status: 'approved' })}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={list.data.page}
              limit={list.data.limit}
              total={list.data.total}
              hasMore={list.data.hasMore}
              onPage={(p) => setParams({ status: tab, page: String(p) })}
            />
          </>
        )}
      </section>
    </>
  );
}
