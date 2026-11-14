import { env, insecureApiUrl } from '@/config/env';
import { currentApiLang } from '@/i18n';
import { ApiError, apiErrorFromBody } from './errors';

const TIMEOUT_MS = 15_000;

/** Provided by the auth layer: returns a fresh bearer token (or null when signed out). */
type TokenProvider = () => Promise<string | null>;
let tokenProvider: TokenProvider = async () => null;

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider;
}

export type QueryValue = string | number | boolean | undefined | null | readonly (string | number)[];
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  body?: unknown;
  /** Attach Authorization if a user is signed in (default: true). */
  auth?: boolean;
  /** Fail with UNAUTHENTICATED before calling the network if no token is available. */
  requireAuth?: boolean;
  /** Append `lang` from the current UI language (default: false; only on endpoints that accept it). */
  lang?: boolean;
  signal?: AbortSignal;
}

/** Builds a query string, dropping empty values (backend schemas reject unknown/empty keys). */
export function buildQuery(query: Query | undefined): string {
  if (!query) return '';
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    const str = Array.isArray(value) ? value.join(',') : String(value);
    if (str === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(str)}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, requireAuth = false, lang = false, signal } = opts;
  if (insecureApiUrl) {
    throw new ApiError({ code: 'NETWORK_ERROR', status: 0, message: 'Refusing to call a non-https API URL in a production build' });
  }
  const query: Query = { ...opts.query };
  if (lang) query.lang = currentApiLang();
  const url = `${env.apiUrl}${path}${buildQuery(query)}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth || requireAuth) {
    const token = await tokenProvider().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
    else if (requireAuth) {
      throw new ApiError({ code: 'UNAUTHENTICATED', status: 401, message: 'Sign in required' });
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      credentials: 'omit',
    });
  } catch (e) {
    const aborted = controller.signal.aborted && !signal?.aborted;
    throw new ApiError({
      code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
      status: 0,
      message: aborted ? 'Request timed out' : e instanceof Error ? e.message : 'Network error',
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new ApiError({ code: 'BAD_RESPONSE', status: res.status, message: 'Invalid JSON response' });
    }
  }
  if (!res.ok) throw apiErrorFromBody(res.status, json);
  return json as T;
}
