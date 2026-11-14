import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from './storage';
import type { Listing } from '@/api/types';

/** Hard cap so the offline store cannot grow unbounded on device. */
export const MAX_OFFLINE_ITEMS = 200;

export interface OfflineEntry {
  listing: Listing;
  savedAt: number;
}

interface OfflineState {
  /** Ordered newest first. Contains only PUBLIC listing data. */
  items: OfflineEntry[];
  isSaved: (id: string) => boolean;
  save: (listing: Listing) => { ok: boolean; reason?: 'limit' };
  refresh: (listing: Listing) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      items: [],
      isSaved: (id) => get().items.some((e) => e.listing.id === id),
      save: (listing) => {
        const { items } = get();
        const without = items.filter((e) => e.listing.id !== listing.id);
        if (without.length >= MAX_OFFLINE_ITEMS) return { ok: false, reason: 'limit' };
        set({ items: [{ listing, savedAt: Date.now() }, ...without] });
        return { ok: true };
      },
      refresh: (listing) =>
        set((s) =>
          s.items.some((e) => e.listing.id === listing.id)
            ? { items: s.items.map((e) => (e.listing.id === listing.id ? { ...e, listing } : e)) }
            : s,
        ),
      remove: (id) => set((s) => ({ items: s.items.filter((e) => e.listing.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    {
      name: 'dt.offline.v1',
      storage: asyncJsonStorage,
      version: 1,
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export const useIsSavedOffline = (id: string | undefined) =>
  useOfflineStore((s) => (id ? s.items.some((e) => e.listing.id === id) : false));
