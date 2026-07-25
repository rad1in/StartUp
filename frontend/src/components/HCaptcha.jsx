import { useEffect, useRef } from 'react';
import { HCAPTCHA_LIGHT_THEME } from './hcaptchaTheme';

// Loaded once and cached — every widget instance on the page reuses the same
// script tag/promise instead of re-fetching hCaptcha's JS per mount.
// `custom=true` opts into custom theming (see hcaptchaTheme.js); ignored
// silently by hCaptcha on plans that don't support it.
let scriptPromise = null;
function loadScript() {
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&custom=true';
      script.async = true;
      script.onload = () => resolve(window.hcaptcha);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export default function HCaptcha({ siteKey, onVerify, onExpire, theme = HCAPTCHA_LIGHT_THEME }) {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadScript().then((hcaptcha) => {
      if (cancelled || !containerRef.current || !siteKey) return;
      widgetIdRef.current = hcaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        callback: onVerify,
        'expired-callback': onExpire,
      });
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try {
          window.hcaptcha.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="my-2" />;
}
