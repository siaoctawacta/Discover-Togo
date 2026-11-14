import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { EmptyState, ErrorState, PageHeader, Pagination, Spinner } from '../components/ui';
import { errorMessage } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtDateTime } from '../lib/format';

export function AuditLogPage() {
  const [params, setParams] = useSearchParams();
  const n = Number(params.get('page'));
  const page = Number.isInteger(n) && n >= 1 ? n : 1;
  const list = useQuery({
    queryKey: ['audit', page],
    queryFn: () => endpoints.auditLogs({ page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Audit log" subtitle="Every administrative change, newest first" />
      <section className="card card-flush">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data.data.length === 0 ? (
          <EmptyState>No audit entries yet.</EmptyState>
        ) : (
          <>
            <div className={`table-wrap${list.isPlaceholderData ? ' is-stale' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Target</th>
                    <th scope="col">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((a) => (
                    <tr key={a.id}>
                      <td className="nowrap muted">{fmtDateTime(a.createdAt)}</td>
                      <td>
                        {a.actorEmail}
                        <span className="muted small block mono">{a.actorId}</span>
                      </td>
                      <td><code className="code-pill">{a.action}</code></td>
                      <td>
                        {a.targetType}
                        <span className="muted small block mono">{a.targetId}</span>
                      </td>
                      <td className="mono muted">{a.ip}</td>
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
              onPage={(p) => setParams({ page: String(p) })}
            />
          </>
        )}
      </section>
    </>
  );
}
