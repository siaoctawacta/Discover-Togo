import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isAllowedImageUrl, isHttpsUrl } from '../lib/url';

/** External link: https only, opened in a new tab without opener/referrer. Non-https renders as text. */
export function ExternalLink({ href, children }: { href: string | undefined; children?: ReactNode }) {
  if (!isHttpsUrl(href)) return <span>{children ?? href ?? '—'}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children ?? href}
    </a>
  );
}

/** Image preview that only loads allow-listed https URLs; otherwise shows a placeholder. */
export function SafeImage({ src, alt, className }: { src: string | undefined; alt: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const blocked = Boolean(src) && !isAllowedImageUrl(src);
  if (blocked || !isAllowedImageUrl(src) || failedSrc === src) {
    return (
      <div
        className={`img-placeholder${blocked ? ' is-blocked' : ''} ${className ?? ''}`}
        role="img"
        aria-label={blocked ? 'Image URL not allowed' : alt || 'No preview'}
        title={blocked ? 'Only https URLs on allowed image hosts are previewed' : undefined}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          {blocked ? (
            <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3v.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="m3 16 5-5 4 4 3-3 6 6" strokeLinejoin="round" />
              <circle cx="16" cy="9" r="1.5" />
            </>
          )}
        </svg>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
}

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner-wrap" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="state">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="muted">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Pagination({
  page, limit, total, hasMore, onPage,
}: { page: number; limit: number; total: number; hasMore: boolean; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="muted">
        {from}–{to} of {total}
      </span>
      <div className="pagination-buttons">
        <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ‹ Prev
        </button>
        <span className="pagination-page">
          Page {page} / {pages}
        </span>
        <button type="button" className="btn btn-secondary btn-sm" disabled={!hasMore} onClick={() => onPage(page + 1)}>
          Next ›
        </button>
      </div>
    </nav>
  );
}

/** Accessible confirm dialog built on the native <dialog> element. */
export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="confirm-title"
    >
      <h2 id="confirm-title">{title}</h2>
      <div className="dialog-body">{message}</div>
      <div className="dialog-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </button>
        <button
          type="button"
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={onConfirm}
          disabled={busy}
          autoFocus
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
