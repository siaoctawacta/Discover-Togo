import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { listingFilter, trusted } from '../src/repo/mongo/mongoRepo.js';

const require = createRequire(import.meta.url);
// Mongoose's own sanitizer — the exact function applied to every query (sanitizeFilter: true).
const sanitizeFilter: (f: object) => object = require('mongoose/lib/helpers/query/sanitizeFilter.js');

describe('Mongo filter building vs. sanitizeFilter', () => {
  it('keeps server-built operators intact once trusted', () => {
    const f = trusted(
      listingFilter({
        kind: 'restaurant', priceLevels: [1, 2], minRating: 4, q: 'lomé', minPrice: 10, maxPrice: 50,
        excludeIds: ['a'.repeat(24)], bbox: [0, 6, 1, 7],
      }),
    );
    const out = sanitizeFilter(structuredCloneKeepSymbols(f)) as Record<string, Record<string, unknown>>;
    expect(out.priceLevel).toHaveProperty('$in');
    expect(out.rating).toHaveProperty('$gte');
    expect(out.searchText).toMatchObject({ $regex: 'lome' });
    expect(out.searchText).not.toHaveProperty('$eq');
    expect(out.geo).toHaveProperty('$geoWithin');
    expect(out._id).toHaveProperty('$nin');
  });

  it('still neutralises untrusted operator objects', () => {
    const out = sanitizeFilter({ email: { $ne: null } }) as Record<string, unknown>;
    expect(out.email).toEqual({ $eq: { $ne: null } });
  });

  it('escapes regex metacharacters in search', () => {
    expect(listingFilter({ q: 'a.*(b' }).searchText).toEqual({ $regex: 'a\\.\\*\\(b' });
  });
});

// sanitizeFilter mutates in place; shallow copy keeps the trusted symbols on values.
function structuredCloneKeepSymbols<T extends object>(o: T): T {
  return { ...o };
}
