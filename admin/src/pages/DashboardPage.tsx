import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { errorMessage } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtNum } from '../lib/format';
import { KIND_META } from '../lib/kinds';
import { KINDS } from '../lib/types';
import { Badge, ErrorState, PageHeader, SafeImage, Spinner } from '../components/ui';

export function DashboardPage() {
  const q = useQuery({ queryKey: ['stats'], queryFn: endpoints.stats });

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Overview of Discover Togo content and community" />
      {q.isPending ? (
        <Spinner />
      ) : q.isError ? (
        <ErrorState message={errorMessage(q.error)} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <section className="stat-grid" aria-label="Key figures">
            {KINDS.map((k) => (
              <Link key={k} to={`/${KIND_META[k].path}`} className={`stat-card stat-${k}`}>
                <span className="stat-label">{KIND_META[k].plural}</span>
                <span className="stat-value">{fmtNum(q.data.listings[k])}</span>
              </Link>
            ))}
            <div className="stat-card stat-users">
              <span className="stat-label">Users</span>
              <span className="stat-value">{fmtNum(q.data.users)}</span>
            </div>
            <Link to="/reviews" className="stat-card stat-pending">
              <span className="stat-label">Pending reviews</span>
              <span className="stat-value">{fmtNum(q.data.pendingReviews)}</span>
              {q.data.pendingReviews > 0 && <span className="stat-hint">Needs moderation →</span>}
            </Link>
          </section>

          <section className="card">
            <h2 className="card-title">Top viewed listings</h2>
            {q.data.topViewed.length === 0 ? (
              <p className="muted">No views recorded yet.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">Listing</th>
                      <th scope="col">Kind</th>
                      <th scope="col">City</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="num">Rating</th>
                      <th scope="col" className="num">Views</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.topViewed.map((l, i) => (
                      <tr key={l.id}>
                        <td className="muted">{i + 1}</td>
                        <td>
                          <Link to={`/${KIND_META[l.kind].path}/${encodeURIComponent(l.id)}`} className="cell-listing">
                            <SafeImage src={l.coverImage} alt="" className="thumb" />
                            <span>
                              <span className="cell-title">{l.name.en}</span>
                              <span className="muted small">{l.name.fr}</span>
                            </span>
                          </Link>
                        </td>
                        <td>{KIND_META[l.kind].label}</td>
                        <td>{l.city}</td>
                        <td><Badge tone={l.status}>{l.status}</Badge></td>
                        <td className="num">{l.rating.toFixed(1)}</td>
                        <td className="num strong">{fmtNum(l.views)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
