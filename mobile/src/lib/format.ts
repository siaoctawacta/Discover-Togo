import type { Listing } from '@/api/types';

/** West African CFA franc formatting: "12 500 FCFA". */
export function formatXOF(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  const rounded = Math.round(amount);
  const grouped = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${rounded < 0 ? '-' : ''}${grouped} FCFA`;
}

export function formatRating(r: number | undefined): string {
  return typeof r === 'number' && Number.isFinite(r) ? r.toFixed(1) : '–';
}

export function priceLevelLabel(level: number | undefined): string {
  return level ? '₣'.repeat(Math.max(1, Math.min(4, level))) : '';
}

/** Short price text used on stat boxes and footer. `freeLabel` is translated by caller. */
export function listingPrice(listing: Listing, freeLabel: string): string | null {
  switch (listing.kind) {
    case 'place':
      if (listing.entryFee === null) return freeLabel;
      return listing.entryFee ? formatXOF(listing.entryFee.amount) : null;
    case 'hotel':
      return listing.priceRange ? formatXOF(listing.priceRange.min) : null;
    case 'restaurant': {
      const prices = (listing.menu ?? []).map((m) => m.price).filter((p) => Number.isFinite(p));
      if (prices.length) return formatXOF(Math.min(...prices));
      return listing.priceLevel ? priceLevelLabel(listing.priceLevel) : null;
    }
  }
}

export function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

export function initials(name: string | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}
