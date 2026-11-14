import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { IconPlus } from '../components/icons';
import { useToast } from '../components/Toast';
import {
  Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, SafeImage, Spinner,
} from '../components/ui';
import { useDebounced } from '../lib/useDebounced';
import { errorMessage } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtDate, fmtNum, humanize } from '../lib/format';
import { KIND_META } from '../lib/kinds';
import { LISTING_STATUSES, type AdminListing, type Kind, type ListingStatus } from '../lib/types';

function parseStatus(v: string | null): ListingStatus | '' {
  return v && (LISTING_STATUSES as readonly string[]).includes(v) ? (v as ListingStatus) : '';
}
function parsePage(v: string | null): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 10_000 ? n : 1;
}

function subtitleFor(l: AdminListing): string {
  if (l.kind === 'place') return l.category ? humanize(l.category) : '';
  if (l.kind === 'restaurant') {
    return [l.cuisine ? humanize(l.cuisine) : '', l.priceLevel ? `Price ${l.priceLevel}/4` : ''].filter(Boolean).join(' · ');
  }
  return [l.hotelType ? humanize(l.hotelType) : '', l.stars ? `${'★'.repeat(l.stars)}` : ''].filter(Boolean).join(' · ');
}

export function ListingsPage({ kind }: { kind: Kind }) {
  const meta = KIND_META[kind];
  const { isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const status = parseStatus(params.get('status'));
  const page = parsePage(params.get('page'));
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim().slice(0, 80), 350);
  const [toDelete, setToDelete] = useState<AdminListing | null>(null);

  useEffect(() => {
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (q) next.set('q', q);
        else next.delete('q');
        if ((p.get('q') ?? '') !== q) next.delete('page');
        return next;
      },
      { replace: true },
    );
  }, [q, setParams]);

  function update(key: string, value: string) {
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== 'page') next.delete('page');
      return next;
    });
  }

  const list = useQuery({
    queryKey: ['listings', kind, { status, q, page }],
    queryFn: () => endpoints.listings({ kind, status, q, page }),
    placeholderData: keepPreviousData,
  });

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteListing(id),
    onSuccess: () => {
      toast.show(`${meta.label} deleted`, 'success');
      setToDelete(null);
      void qc.invalidateQueries({ queryKey: ['listings', kind] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
    },
    onError: (e) => toast.show(errorMessage(e), 'error'),
  });

  return (
    <>
      <PageHeader
        title={meta.plural}
        subtitle={list.data ? `${fmtNum(list.data.total)} total` : undefined}
        actions={
          <Link to={`/${meta.path}/new`} className="btn btn-primary">
            <IconPlus /> New {meta.label.toLowerCase()}
          </Link>
        }
      />

      <div className="toolbar" role="search">
        <label className="field grow">
          <span className="sr-only">Search</span>
          <input
            type="search"
            placeholder={`Search ${meta.plural.toLowerCase()} by name…`}
            value={search}
            maxLength={80}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="segmented" role="group" aria-label="Filter by status">
          {(['', ...LISTING_STATUSES] as const).map((s) => (
            <button
              key={s || 'all'}
              type="button"
              className={status === s ? 'active' : ''}
              aria-pressed={status === s}
              onClick={() => update('status', s)}
            >
              {s ? humanize(s) : 'All'}
            </button>
          ))}
        </div>
      </div>

      <section className="card card-flush">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data.data.length === 0 ? (
          <EmptyState>No {meta.plural.toLowerCase()} match these filters.</EmptyState>
        ) : (
          <>
            <div className={`table-wrap${list.isPlaceholderData ? ' is-stale' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Location</th>
                    <th scope="col">Status</th>
                    <th scope="col">Flags</th>
                    <th scope="col" className="num">Rating</th>
                    <th scope="col" className="num">Views</th>
                    <th scope="col">Updated</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <Link to={`/${meta.path}/${encodeURIComponent(l.id)}`} className="cell-listing">
                          <SafeImage src={l.coverImage} alt="" className="thumb" />
                          <span>
                            <span className="cell-title">{l.name.en}</span>
                            <span className="muted small">{subtitleFor(l) || l.name.fr}</span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        {l.city}
                        <span className="muted small block">{humanize(l.region)}</span>
                      </td>
                      <td><Badge tone={l.status}>{l.status}</Badge></td>
                      <td>
                        <span className="flags">
                          {l.featured && <Badge tone="teal">Featured</Badge>}
                          {l.sponsored && <Badge tone="gold">Sponsored</Badge>}
                        </span>
                      </td>
                      <td className="num">
                        {l.rating.toFixed(1)} <span className="muted small">({fmtNum(l.reviewCount)})</span>
                      </td>
                      <td className="num">{fmtNum(l.views)}</td>
                      <td className="muted">{fmtDate(l.updatedAt)}</td>
                      <td className="actions">
                        <Link to={`/${meta.path}/${encodeURIComponent(l.id)}`} className="btn btn-secondary btn-sm">
                          Edit
                        </Link>
                        {isAdmin && (
                          <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => setToDelete(l)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={list.data.page}
              limit={list.data.limit}
              total={list.data.total}
              hasMore={list.data.hasMore}
              onPage={(p) => update('page', String(p))}
            />
          </>
        )}
      </section>

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete ${meta.label.toLowerCase()}?`}
        message={
          <p>
            “{toDelete?.name.en}” will be permanently deleted. This cannot be undone. Consider archiving instead.
          </p>
        }
        confirmLabel="Delete permanently"
        danger
        busy={del.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => toDelete && del.mutate(toDelete.id)}
      />
    </>
  );
}
