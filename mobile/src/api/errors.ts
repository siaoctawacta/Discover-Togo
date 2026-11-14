import type { ApiErrorCode } from './types';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: unknown[];

  constructor(params: { code: ApiErrorCode; message: string; status: number; requestId?: string; details?: unknown[] }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.requestId = params.requestId;
    this.details = params.details;
  }

  get isNetwork(): boolean {
    return this.code === 'NETWORK_ERROR' || this.code === 'TIMEOUT';
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const KNOWN: ApiErrorCode[] = [
  'VALIDATION_ERROR', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT',
  'PAYLOAD_TOO_LARGE', 'UNSUPPORTED_MEDIA_TYPE', 'RATE_LIMITED', 'INTERNAL',
];

/** Parse the `{ error: { code, message, requestId, details } }` envelope defensively. */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const err = (body as { error?: Record<string, unknown> } | null)?.error;
  const rawCode = typeof err?.code === 'string' ? err.code : '';
  const code = (KNOWN as string[]).includes(rawCode) ? (rawCode as ApiErrorCode) : status >= 500 ? 'INTERNAL' : 'BAD_RESPONSE';
  return new ApiError({
    code,
    status,
    message: typeof err?.message === 'string' ? err.message : `Request failed (${status})`,
    requestId: typeof err?.requestId === 'string' ? err.requestId : undefined,
    details: Array.isArray(err?.details) ? err.details : undefined,
  });
}
