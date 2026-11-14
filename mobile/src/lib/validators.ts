import { KINDS, type Kind } from '@/api/types';

export const OBJECT_ID_RE = /^[a-f0-9]{24}$/;
export const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export const REVIEW_MIN = 10;
export const REVIEW_MAX = 1000;
export const DISPLAY_NAME_MAX = 60;
export const PASSWORD_MIN = 8;

/** Route params can be string | string[] | undefined — normalise to a single string. */
export function firstParam(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export function isObjectId(v: unknown): v is string {
  return typeof v === 'string' && OBJECT_ID_RE.test(v);
}

export function isIdOrSlug(v: unknown): v is string {
  return typeof v === 'string' && (OBJECT_ID_RE.test(v) || SLUG_RE.test(v));
}

export function isKind(v: unknown): v is Kind {
  return typeof v === 'string' && (KINDS as readonly string[]).includes(v);
}

export function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return typeof v === 'string' && (values as readonly string[]).includes(v);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmail(v: string): boolean {
  return v.length <= 254 && EMAIL_RE.test(v.trim());
}

export type FieldError = string | null; // i18n key or null

export function validateReview(rating: number, comment: string): { rating: FieldError; comment: FieldError } {
  const len = comment.trim().length;
  return {
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? null : 'validation.rating',
    comment: len < REVIEW_MIN ? 'validation.reviewTooShort' : len > REVIEW_MAX ? 'validation.reviewTooLong' : null,
  };
}

export function validateDisplayName(name: string): FieldError {
  const n = name.trim();
  if (!n) return 'validation.required';
  return n.length > DISPLAY_NAME_MAX ? 'validation.nameTooLong' : null;
}

export function validatePassword(pw: string): FieldError {
  return pw.length >= PASSWORD_MIN ? null : 'validation.passwordShort';
}
