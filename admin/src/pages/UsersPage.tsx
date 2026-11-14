import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import {
  Badge, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner,
} from '../components/ui';
import { useDebounced } from '../lib/useDebounced';
import { errorMessage } from '../lib/api';
import { endpoints } from '../lib/endpoints';
import { fmtDate } from '../lib/format';
import { ROLES, USER_STATUSES, type Me, type Role, type UserStatus } from '../lib/types';

type Pending = { user: Me; change: { role?: Role; status?: UserStatus } };

export function UsersPage() {
  const { me } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const role = (ROLES as readonly string[]).includes(params.get('role') ?? '') ? (params.get('role') as Role) : '';
  const status = (USER_STATUSES as readonly string[]).includes(params.get('status') ?? '') ? (params.get('status') as UserStatus) : '';
  const pageNum = Number(params.get('page'));
  const page = Number.isInteger(pageNum) && pageNum >= 1 ? pageNum : 1;
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim().slice(0, 80), 350);
  const [pending, setPending] = useState<Pending | null>(null);

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
    queryKey: ['users', { q, role, status, page }],
    queryFn: () => endpoints.users({ q, role, status, page }),
    placeholderData: keepPreviousData,
  });

  const mutate = useMutation({
    mutationFn: ({ user, change }: Pending) => endpoints.updateUser(user.id, change),
    onSuccess: (u) => {
      toast.show(`Updated ${u.email}`, 'success');
      setPending(null);
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (e) => toast.show(errorMessage(e), 'error'),
  });

  const describe = (p: Pending) =>
    p.change.role
      ? `Change the role of ${p.user.email} from “${p.user.role}” to “${p.change.role}”?`
      : p.change.status === 'suspended'
        ? `Suspend ${p.user.email}? They will be signed out and unable to use the app.`
        : `Reactivate ${p.user.email}?`;

  return (
    <>
      <PageHeader title="Users" subtitle={list.data ? `${list.data.total} accounts` : undefined} />
      <div className="toolbar" role="search">
        <label className="field grow">
          <span className="sr-only">Search users</span>
          <input type="search" placeholder="Search by email or name…" value={search} maxLength={80} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="field">
          <span className="sr-only">Role</span>
          <select value={role} onChange={(e) => update('role', e.target.value)}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => update('status', e.target.value)}>
            <option value="">All statuses</option>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="card card-flush">
        {list.isPending ? (
          <Spinner />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        ) : list.data.data.length === 0 ? (
          <EmptyState>No users match these filters.</EmptyState>
        ) : (
          <>
            <div className={`table-wrap${list.isPlaceholderData ? ' is-stale' : ''}`}>
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Language</th>
                    <th scope="col">Joined</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <span className="cell-title">
                            {u.displayName || '—'} {self && <Badge tone="teal">you</Badge>}
                          </span>
                          <span className="muted small block">{u.email}</span>
                        </td>
                        <td>
                          <label className="sr-only" htmlFor={`role-${u.id}`}>Role for {u.email}</label>
                          <select
                            id={`role-${u.id}`}
                            className="select-sm"
                            value={u.role}
                            disabled={self || mutate.isPending}
                            title={self ? 'You cannot change your own role' : undefined}
                            onChange={(e) => setPending({ user: u, change: { role: e.target.value as Role } })}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </td>
                        <td><Badge tone={u.status === 'active' ? 'published' : 'danger'}>{u.status}</Badge></td>
                        <td className="muted">{u.preferences?.language?.toUpperCase() ?? '—'}</td>
                        <td className="muted">{fmtDate(u.createdAt)}</td>
                        <td className="actions">
                          {u.status === 'active' ? (
                            <button
                              type="button"
                              className="btn btn-danger-ghost btn-sm"
                              disabled={self || mutate.isPending}
                              title={self ? 'You cannot suspend your own account' : undefined}
                              onClick={() => setPending({ user: u, change: { status: 'suspended' } })}
                            >
                              Suspend
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={self || mutate.isPending}
                              onClick={() => setPending({ user: u, change: { status: 'active' } })}
                            >
                              Reactivate
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
        open={pending !== null}
        title={pending?.change.role ? 'Change role?' : pending?.change.status === 'suspended' ? 'Suspend user?' : 'Reactivate user?'}
        message={pending ? <p>{describe(pending)}</p> : null}
        confirmLabel={pending?.change.status === 'suspended' ? 'Suspend' : 'Confirm'}
        danger={pending?.change.status === 'suspended' || pending?.change.role === 'admin'}
        busy={mutate.isPending}
        onCancel={() => setPending(null)}
        onConfirm={() => pending && mutate.mutate(pending)}
      />
    </>
  );
}
