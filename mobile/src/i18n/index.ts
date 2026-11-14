import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import fr from './locales/fr.json';
import { DEFAULT_LANGUAGE, isSupportedLanguage, toApiLang, type ApiLanguage, type SupportedLanguage } from './languages';

export const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const;

export function deviceLanguage(): SupportedLanguage {
  for (const locale of getLocales()) {
    const code = locale.languageCode ?? '';
    if (isSupportedLanguage(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false }, // React Native renders plain text; no HTML.
  returnNull: false,
});

/** Language code sent as `?lang=` to the API. */
export function currentApiLang(): ApiLanguage {
  return toApiLang(i18n.language || DEFAULT_LANGUAGE);
}

export default i18n;
