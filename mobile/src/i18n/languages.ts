/**
 * Supported UI languages. To add Ewe / Kabiyè later:
 *  1. add `src/i18n/locales/ee.json` (or `kbp.json`) with the same keys as en.json,
 *  2. register it in `resources` (src/i18n/index.ts) and in LANGUAGES below,
 *  3. set `apiLang` to the closest language the API serves (API only localizes en/fr today).
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', apiLang: 'en' },
  { code: 'fr', label: 'Français', apiLang: 'fr' },
] as const;

export type SupportedLanguage = (typeof LANGUAGES)[number]['code'];
export type ApiLanguage = 'en' | 'fr';

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(code: string | null | undefined): code is SupportedLanguage {
  return LANGUAGES.some((l) => l.code === code);
}

export function toApiLang(code: string): ApiLanguage {
  const found = LANGUAGES.find((l) => l.code === code);
  return (found?.apiLang ?? 'en') as ApiLanguage;
}
