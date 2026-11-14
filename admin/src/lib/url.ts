import { IMAGE_HOSTS } from './config';

/** True only for absolute https:// URLs (rejects javascript:, data:, http:, relative, etc.). */
export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && Boolean(u.hostname) && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** https URL on the image host allow-list (mirrors the API's IMAGE_HOSTS check). */
export function isAllowedImageUrl(value: unknown): value is string {
  if (!isHttpsUrl(value)) return false;
  const host = new URL(value).hostname.toLowerCase();
  return IMAGE_HOSTS.includes(host);
}
