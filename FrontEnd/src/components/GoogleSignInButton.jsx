import { useEffect, useRef, useState } from 'react';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return gisPromise;
}

// Renders the official Google Identity Services button and hands the returned
// ID token to `onCredential`. If no client ID is configured, shows a disabled
// placeholder instead of a broken button.
export default function GoogleSignInButton({ onCredential }) {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resp) => onCredential(resp.credential),
        });
        window.google.accounts.id.renderButton(ref.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'pill',
          locale: 'fa',
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [onCredential]);

  if (!CLIENT_ID || failed) {
    return (
      <button
        type="button"
        disabled
        title="برای فعال‌سازی، VITE_GOOGLE_CLIENT_ID را تنظیم کنید"
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full border border-black/10 bg-surface-2/60 text-ink/40 text-sm font-bold cursor-not-allowed"
      >
        <GoogleGlyph />
        ورود با گوگل (نیازمند پیکربندی)
      </button>
    );
  }

  return <div ref={ref} className="flex justify-center" />;
}

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
