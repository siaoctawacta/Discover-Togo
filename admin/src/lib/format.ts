const dateFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const numFmt = new Intl.NumberFormat('en-US');

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateFmt.format(d);
}
export function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d);
}
export function fmtNum(n?: number | null): string {
  return typeof n === 'number' && Number.isFinite(n) ? numFmt.format(n) : '—';
}
/** "fast_food" -> "Fast food" */
export function humanize(id: string): string {
  const s = id.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
