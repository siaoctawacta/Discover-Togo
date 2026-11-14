import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';
import { useAuth } from '../auth/AuthProvider';
import { errorMessage } from '../lib/api';
import { DEV_AUTH, FIREBASE_ENABLED } from '../lib/config';
import { DevLogin } from './DevLogin';

const emailSchema = z.object({
  email: z.email('Enter a valid email').max(254),
  password: z.string().min(6, 'At least 6 characters').max(128),
});
type EmailForm = z.infer<typeof emailSchema>;


export function LoginPage() {
  const { status, notice, clearNotice, emailSignIn, googleSignIn, devSignIn } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailForm = useForm<EmailForm>({ resolver: zodResolver(emailSchema), defaultValues: { email: '', password: '' } });

  if (status === 'signedIn') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from.startsWith('/') && !from.startsWith('//') ? from : '/'} replace />;
  }

  async function run(fn: () => Promise<void>) {
    setError(null);
    clearNotice();
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const message = error ?? notice;

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <svg viewBox="0 0 32 32" width="44" height="44" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2F4A2A" /><path d="M6 23 13 11l5 8 3-4 5 8z" fill="#5BC0C8" /><circle cx="23" cy="9" r="3" fill="#E8A33D" /></svg>
          <div>
            <h1>Discover Togo</h1>
            <p className="muted">Admin dashboard — editors &amp; administrators only</p>
          </div>
        </div>

        {message && (
          <div className={`alert ${error || notice?.startsWith('Access denied') ? 'alert-error' : 'alert-info'}`} role="alert">
            {message}
          </div>
        )}

        {FIREBASE_ENABLED ? (
          <>
            <form
              className="form-stack"
              noValidate
              onSubmit={emailForm.handleSubmit((v) => run(() => emailSignIn(v.email, v.password)))}
            >
              <label className="field">
                <span>Email</span>
                <input type="email" autoComplete="username" {...emailForm.register('email')} />
                {emailForm.formState.errors.email && <small className="field-error">{emailForm.formState.errors.email.message}</small>}
              </label>
              <label className="field">
                <span>Password</span>
                <input type="password" autoComplete="current-password" {...emailForm.register('password')} />
                {emailForm.formState.errors.password && <small className="field-error">{emailForm.formState.errors.password.message}</small>}
              </label>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
            <div className="divider"><span>or</span></div>
            <button type="button" className="btn btn-secondary btn-block" disabled={busy} onClick={() => run(googleSignIn)}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" /><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" /><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" /><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" /></svg>
              Continue with Google
            </button>
          </>
        ) : (
          !DEV_AUTH && (
            <div className="alert alert-error" role="alert">
              Firebase is not configured. Set the VITE_FIREBASE_* variables (see .env.example).
            </div>
          )
        )}

        {/* MODE check is inlined so production builds drop the dev login entirely. */}
        {import.meta.env.MODE !== 'production' && DEV_AUTH && (
          <DevLogin busy={busy} onSubmit={(v) => run(() => devSignIn(v.uid, v.role))} />
        )}
      </div>
    </div>
  );
}
