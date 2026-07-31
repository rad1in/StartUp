import { createContext, useContext, useEffect, useState } from 'react';
import translations, { LANGUAGES, DEFAULT_LANG, RTL_LANGS } from '../i18n/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'et-cafe-lang';

// Intl locale per UI language — drives number/date formatting so an English or
// Turkish visitor doesn't get Persian numerals (۱۲۳) mixed into Latin text.
// Mirrors the mobile app's i18n.js, which already worked this way.
const LOCALES = { en: 'en-US', fa: 'fa-IR', ar: 'ar-SA', tr: 'tr-TR' };

function getInitialLang() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && LANGUAGES.some((l) => l.code === saved)) return saved;
  // English is the platform default — unlike theme, we do NOT read the
  // browser/OS locale here, so a first-time visitor always lands in English
  // regardless of their device language; a choice only changes on request.
  return DEFAULT_LANG;
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);
  const isRTL = RTL_LANGS.includes(lang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    localStorage.setItem(STORAGE_KEY, lang);
  }, [lang, isRTL]);

  function setLang(next) {
    if (LANGUAGES.some((l) => l.code === next)) setLangState(next);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations[DEFAULT_LANG]?.[key] ?? key;
  }

  const locale = LOCALES[lang] || LOCALES[DEFAULT_LANG];
  const n = (value) => Number(value ?? 0).toLocaleString(locale);
  const date = (value) => (value ? new Date(value).toLocaleString(locale) : '');
  const dateShort = (value) => (value ? new Date(value).toLocaleDateString(locale) : '');
  const timeShort = (value) => (value ? new Date(value).toLocaleTimeString(locale) : '');

  return (
    <LanguageContext.Provider value={{ lang, locale, setLang, isRTL, t, n, date, dateShort, timeShort, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
