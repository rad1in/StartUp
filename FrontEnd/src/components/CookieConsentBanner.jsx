import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const STORAGE_KEY = 'cookie-consent';

export function getCookieConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function CookieConsentBanner({ onChange }) {
  const { t } = useLanguage();
  const [choice, setChoice] = useState(() => getCookieConsent());

  useEffect(() => {
    if (choice) onChange?.(choice);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function decide(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* localStorage may be unavailable in private mode — consent still applies for this session */
    }
    setChoice(value);
    onChange?.(value);
  }

  if (choice) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-fade-up">
      <div className="glass-strong max-w-3xl mx-auto rounded-2xl shadow-card px-4 py-3.5 sm:px-5 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-[13px] leading-relaxed text-ink/70 flex-1 text-center sm:text-start">
          {t('cookies.message')}{' '}
          <Link to="/privacy" className="text-accent-700 hover:text-accent-600 underline underline-offset-2 font-bold transition-colors">
            {t('cookies.privacyLink')}
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide('declined')}
            className="px-4 py-2 rounded-full text-sm font-semibold text-ink/60 hover:text-ink hover:bg-black/5 transition-colors"
          >
            {t('cookies.decline')}
          </button>
          <button type="button" onClick={() => decide('accepted')} className="btn-gold px-5 py-2 text-sm">
            {t('cookies.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
