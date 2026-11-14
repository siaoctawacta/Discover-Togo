import * as Linking from 'expo-linking';

const ALLOWED_SCHEMES = new Set(['http:', 'https:', 'tel:', 'mailto:']);

/** Parses and returns the URL only if it uses an allow-listed scheme. */
export function sanitizeExternalUrl(raw: string | undefined | null): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const value = raw.trim();
  if (value.length > 2048) return null;
  const scheme = /^([a-z][a-z0-9+.-]*:)/i.exec(value)?.[1]?.toLowerCase();
  if (!scheme || !ALLOWED_SCHEMES.has(scheme)) return null;
  if (scheme === 'http:' || scheme === 'https:') {
    try {
      const u = new URL(value);
      if (!u.hostname) return null;
      return u.toString();
    } catch {
      return null;
    }
  }
  return value;
}

/** Only opens http(s)/tel/mailto URLs. Returns false if refused or failed. */
export async function safeOpenUrl(raw: string | undefined | null): Promise<boolean> {
  const url = sanitizeExternalUrl(raw);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function telUrl(phone: string): string | null {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 6 && cleaned.length <= 20 ? `tel:${cleaned}` : null;
}

export function mailtoUrl(email: string): string | null {
  return /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(email) ? `mailto:${email}` : null;
}
