import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import api from '../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const SUPPORTED = 'serviceWorker' in navigator && 'PushManager' in window;

// Lets the customer opt into real OS-level push notifications (order ready,
// promos, etc.) that arrive even when the app tab is closed — on top of the
// in-app notification center, which always works regardless of this toggle.
export default function PushNotificationToggle() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!SUPPORTED) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setEnabled(Boolean(sub));
    });
  }, []);

  async function enable() {
    setError('');
    setBusy(true);
    try {
      if (Notification.permission === 'denied') {
        setError('اجازه اعلان در تنظیمات مرورگر مسدود شده. از تنظیمات مرورگر آن را فعال کنید.');
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setError('اجازه نمایش اعلان داده نشد.');
        return;
      }
      const { data } = await api.get('/push/public-key');
      if (!data.publicKey) {
        setError('سرویس اعلان در حال حاضر پیکربندی نشده است.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      await api.post('/push/subscribe', subscription.toJSON());
      setEnabled(true);
    } catch (err) {
      setError('فعال‌سازی اعلان با خطا مواجه شد.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/push/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setEnabled(false);
    } finally {
      setBusy(false);
    }
  }

  if (!SUPPORTED) return null;

  return (
    <div className="card-luxe p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-accent-100 text-accent-700' : 'bg-black/[0.04] text-ink/30'
          }`}
        >
          {enabled ? <Bell size={18} /> : <BellOff size={18} />}
        </span>
        <div>
          <p className="font-bold text-ink text-sm">اعلان‌های فوری (Push)</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {enabled ? 'حتی وقتی برنامه بسته است، اعلان دریافت می‌کنی.' : 'برای دریافت اعلان لحظه‌ای وضعیت سفارش فعال کن.'}
          </p>
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        </div>
      </div>
      <button
        onClick={enabled ? disable : enable}
        disabled={busy}
        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
          enabled
            ? 'bg-surface-2/60 text-ink/60 border border-ink/10 hover:border-red-300 hover:text-red-500'
            : 'bg-accent-500 text-white hover:bg-accent-600'
        }`}
      >
        {busy ? '...' : enabled ? 'غیرفعال کردن' : 'فعال‌سازی'}
      </button>
    </div>
  );
}
