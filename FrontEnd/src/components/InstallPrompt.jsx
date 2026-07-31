import { useEffect, useState } from 'react';
import { X, Smartphone } from 'lucide-react';

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_DAYS = 7;

// Floating "نصب اپلیکیشن" card. Chrome/Edge fire `beforeinstallprompt` when the
// PWA criteria are met; we stash the event and show our own luxe prompt.
// Dismissal is remembered for a week so it never nags.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000) return;
      setDeferred(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    setVisible(false);
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed bottom-24 md:bottom-6 inset-x-4 md:inset-x-auto md:left-6 z-40 md:w-80 animate-fade-up">
      <div className="card-noir p-4 flex items-center gap-3">
        <span className="w-11 h-11 shrink-0 rounded-2xl bg-white/10 border border-accent-300/30 flex items-center justify-center text-accent-300">
          <Smartphone size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-extrabold">نصب اپلیکیشن</p>
          <p className="text-[11px] text-white/55 mt-0.5 leading-relaxed">دسترسی سریع‌تر، حتی آفلاین — بدون نیاز به استور.</p>
        </div>
        <div className="flex flex-col items-stretch gap-1.5 shrink-0">
          <button type="button" onClick={install} className="btn-gold text-xs px-4 py-2">
            نصب
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors"
          >
            <X size={12} />
            بعداً
          </button>
        </div>
      </div>
    </div>
  );
}
