import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cookie-consent';

export function getCookieConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function CookieConsentBanner({ onChange }) {
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
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 sm:p-5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
        <p className="text-sm text-gray-700 dark:text-gray-200 flex-1 text-center sm:text-right">
          ما از کوکی برای بهبود تجربه کاربری و تحلیل ترافیک سایت استفاده می‌کنیم. جزئیات بیشتر را در{' '}
          <a href="/privacy" className="text-primary-700 dark:text-primary-400 underline font-bold">
            حریم خصوصی
          </a>{' '}
          بخوانید.
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => decide('declined')}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200"
          >
            رد کردن
          </button>
          <button
            type="button"
            onClick={() => decide('accepted')}
            className="px-4 py-2 rounded-lg bg-primary-800 text-white text-sm font-bold"
          >
            پذیرفتن
          </button>
        </div>
      </div>
    </div>
  );
}
