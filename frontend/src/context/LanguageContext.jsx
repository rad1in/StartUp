import { createContext, useContext, useEffect, useState } from 'react';
import translations, { LANGUAGES, DEFAULT_LANG, RTL_LANGS } from '../i18n/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'et-cafe-lang';

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

  return (
    <LanguageContext.Provider value={{ lang, setLang, isRTL, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
