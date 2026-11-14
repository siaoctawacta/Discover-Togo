import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { asyncJsonStorage } from './storage';
import type { SupportedLanguage } from '@/i18n/languages';

export type ThemeMode = 'system' | 'light' | 'dark';

interface PrefsState {
  theme: ThemeMode;
  /** null = follow device language */
  language: SupportedLanguage | null;
  onboardingDone: boolean;
  recentSearches: string[];
  setTheme: (theme: ThemeMode) => void;
  setLanguage: (language: SupportedLanguage | null) => void;
  completeOnboarding: () => void;
  addRecentSearch: (q: string) => void;
  removeRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const MAX_RECENT_SEARCHES = 10;

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: 'system',
      language: null,
      onboardingDone: false,
      recentSearches: [],
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      completeOnboarding: () => set({ onboardingDone: true }),
      addRecentSearch: (q) =>
        set((s) => {
          const term = q.trim().slice(0, 80);
          if (term.length < 2) return s;
          const rest = s.recentSearches.filter((x) => x.toLowerCase() !== term.toLowerCase());
          return { recentSearches: [term, ...rest].slice(0, MAX_RECENT_SEARCHES) };
        }),
      removeRecentSearch: (q) => set((s) => ({ recentSearches: s.recentSearches.filter((x) => x !== q) })),
      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: 'dt.prefs.v1',
      storage: asyncJsonStorage,
      version: 1,
      partialize: (s) => ({
        theme: s.theme,
        language: s.language,
        onboardingDone: s.onboardingDone,
        recentSearches: s.recentSearches,
      }),
    },
  ),
);

/** Resolves once the persisted prefs have been read (or immediately if already hydrated). */
export function usePrefsHydrated(): boolean {
  return usePrefs.persist.hasHydrated();
}
