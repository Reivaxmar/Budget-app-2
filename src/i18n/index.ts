import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

// Central i18n setup. Only English exists today — this file, plus every
// component reading strings through useTranslation()/t() instead of
// hard-coding them, is the "ability to be translated" requested up front.
// Adding a real second language later is just:
//   1. add src/i18n/locales/<lng>.json with the same keys
//   2. import it and add it to `resources` below
//   3. add a language switcher that calls i18n.changeLanguage(<lng>)
// No component changes required.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes interpolated values
  },
  returnNull: false,
});

export default i18n;
