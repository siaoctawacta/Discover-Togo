import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Spinner } from './ui';

/** Client-side gate for routes. The API enforces roles server-side; this only hides UI. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Checking session…" />;
  if (status !== 'signedIn') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <AccessDenied />;
  return <>{children}</>;
}

export function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="state state-error" role="alert">
      <h2>Access denied</h2>
      <p>{message ?? 'This section is only available to administrators.'}</p>
    </div>
  );
}
