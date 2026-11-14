import { useTranslation } from 'react-i18next';
import { toApiLang, type ApiLanguage } from '@/i18n/languages';

/** Current `?lang=` value; components re-render (and query keys change) when language changes. */
export function useApiLang(): ApiLanguage {
  const { i18n } = useTranslation();
  return toApiLang(i18n.language);
}
