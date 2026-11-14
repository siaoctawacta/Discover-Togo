import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/RequireRole';
import { useToast } from './components/Toast';
import { onApiError } from './lib/api';
import { AuditLogPage } from './pages/AuditLogPage';
import { DashboardPage } from './pages/DashboardPage';
import { ListingFormPage } from './pages/ListingFormPage';
import { ListingsPage } from './pages/ListingsPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { UsersPage } from './pages/UsersPage';
import { KIND_META } from './lib/kinds';
import { KINDS } from './lib/types';

/** Global feedback for 403 / 429 responses (401 is handled by AuthProvider → sign out). */
function ApiErrorToasts() {
  const toast = useToast();
  useEffect(
    () =>
      onApiError((err) => {
        if (err.status === 403) toast.show(`Access denied: ${err.message}`, 'error');
        else if (err.status === 429) toast.show('Slow down — too many requests. Please wait a moment and try again.', 'warning');
      }),
    [toast],
  );
  return null;
}

function NotFound() {
  return (
    <div className="state">
      <h2>Page not found</h2>
      <Link to="/" className="btn btn-secondary">Back to dashboard</Link>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ApiErrorToasts />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<DashboardPage />} />
            {KINDS.map((k) => (
              <Route key={k} path={KIND_META[k].path}>
                <Route index element={<ListingsPage key={k} kind={k} />} />
                <Route path="new" element={<ListingFormPage key={`${k}-new`} kind={k} />} />
                <Route path=":id" element={<ListingFormPage key={k} kind={k} />} />
              </Route>
            ))}
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="users" element={<RequireAdmin><UsersPage /></RequireAdmin>} />
            <Route path="audit-log" element={<RequireAdmin><AuditLogPage /></RequireAdmin>} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
