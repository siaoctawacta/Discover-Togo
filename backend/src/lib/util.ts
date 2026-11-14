import { createHash, randomBytes } from 'node:crypto';
import type { GeoPoint } from '../domain/types.js';

export const OBJECT_ID_RE = /^[a-f0-9]{24}$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const newId = () => randomBytes(12).toString('hex');
/** Deterministic id so seeded demo data keeps stable ids across restarts. */
export const stableId = (seed: string) => createHash('sha1').update(seed).digest('hex').slice(0, 24);

/** Escape user text before it is ever used inside a RegExp (prevents ReDoS / regex injection). */
export const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lower-case, accent-free form used for matching ("Lomé" ~ "lome"). */
export const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export const slugify = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Plain-text sanitizer for user generated content: strips HTML tags, control
 * characters and zero-width/bidi-override characters, collapses whitespace.
 * Output is always rendered as text by clients, this is defence in depth.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Small TTL set used to de-duplicate view counting (bounded memory). */
export class TtlSet {
  private readonly map = new Map<string, number>();
  constructor(
    private readonly ttlMs: number,
    private readonly max = 50_000,
  ) {}
  /** Returns true if the key was newly added (not seen within TTL). */
  add(key: string, now = Date.now()): boolean {
    const exp = this.map.get(key);
    if (exp && exp > now) return false;
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.delete(key);
    this.map.set(key, now + this.ttlMs);
    return true;
  }
}
