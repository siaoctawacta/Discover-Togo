import { API_URL } from './config';
import type { ApiErrorBody } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string;
  readonly details?: unknown[];

  constructor(status: number, code: string, message: string, requestId?: string, details?: unknown[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.details = details;
  }
}

type TokenProvider = () => Promise<string | null>;
export type ApiErrorListener = (err: ApiError) => void;

let tokenProvider: TokenProvider = async () => null;
const listeners = new Set<ApiErrorListener>();

export function setTokenProvider(fn: TokenProvider): void {
  tokenProvider = fn;
}

/** Subscribe to API errors (used for global 401 / 403 / 429 handling). */
export function onApiError(fn: ApiErrorListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  /** Override token (used to verify a freshly obtained token before committing a session). */
  token?: string;
  /** Do not notify global listeners (e.g. login probe). */
  silent?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = new URL(API_URL + (path.startsWith('/') ? path : `/${path}`));
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function isErrorBody(x: unknown): x is ApiErrorBody {
  return (
    typeof x === 'object' && x !== null && 'error' in x &&
    typeof (x as ApiErrorBody).error === 'object' && (x as ApiErrorBody).error !== null
  );
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = opts.token ?? (await tokenProvider());
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'strict-origin-when-cross-origin',
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'NETWORK', 'Cannot reach the API. Check your connection.');
  }

  if (res.status === 204) return undefined as T;

  let payload: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!res.ok) {
    const err = isErrorBody(payload)
      ? new ApiError(res.status, String(payload.error.code), String(payload.error.message ?? 'Request failed'),
          payload.error.requestId, Array.isArray(payload.error.details) ? payload.error.details : undefined)
      : new ApiError(res.status, res.status === 429 ? 'RATE_LIMITED' : 'HTTP_ERROR', `Request failed (${res.status})`);
    if (!opts.silent) listeners.forEach((l) => l(err));
    throw err;
  }
  return payload as T;
}

/** Human-readable error text, including field details from VALIDATION_ERROR when present. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = (err.details ?? [])
      .map((d) => {
        if (typeof d === 'string') return d;
        if (d && typeof d === 'object') {
          const o = d as { path?: unknown; message?: unknown; field?: unknown };
          const path = Array.isArray(o.path) ? o.path.join('.') : typeof o.path === 'string' ? o.path : typeof o.field === 'string' ? o.field : '';
          const msg = typeof o.message === 'string' ? o.message : '';
          return [path, msg].filter(Boolean).join(': ');
        }
        return '';
      })
      .filter(Boolean)
      .slice(0, 5);
    const ref = err.requestId ? ` (ref ${err.requestId})` : '';
    return details.length ? `${err.message}: ${details.join('; ')}${ref}` : `${err.message}${ref}`;
  }
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}

/** Field-level issues from a VALIDATION_ERROR response: `[{ path: 'name.en', message }]`. */
export function fieldIssues(err: unknown): { path: string; message: string }[] {
  if (!(err instanceof ApiError) || err.code !== 'VALIDATION_ERROR' || !err.details) return [];
  return err.details.flatMap((d) => {
    if (!d || typeof d !== 'object') return [];
    const o = d as { path?: unknown; message?: unknown };
    const path = Array.isArray(o.path) ? o.path.join('.') : typeof o.path === 'string' ? o.path : '';
    return path && typeof o.message === 'string' ? [{ path, message: o.message }] : [];
  });
}
