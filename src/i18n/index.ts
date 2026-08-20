import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import es from './locales/es.json';

// Central i18n setup — every component reads strings through
// useTranslation()/t() instead of hard-coding them, and the PDF renderer
// (src/rendering/EstimateDocument.tsx) reads them straight off this same
// instance, so switching the language here (see setLanguage below) changes
// both the UI and every newly-exported PDF. Adding another language is just:
//   1. add src/i18n/locales/<lng>.json with the same keys
//   2. import it and add it to `resources` below
//   3. add it to LANGUAGES in src/language.ts
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = 'budgetapp.language';

function getStoredLanguage(): SupportedLanguage {
  // localStorage isn't available when this module loads in a non-browser
  // context (e.g. the Node-side PDF rendering tests) — fall back to English.
  const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(raw ?? '')
    ? (raw as SupportedLanguage)
    : 'en';
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes interpolated values
  },
  returnNull: false,
});

/** Persists the language choice and switches the app (and PDF exports) to it immediately. */
export function setLanguage(language: SupportedLanguage): void {
  localStorage.setItem(STORAGE_KEY, language);
  i18n.changeLanguage(language);
}

export default i18n;
