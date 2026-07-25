import { useState } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Two-factor (authenticator app / TOTP) management card. Uses the user's
// `twoFactorEnabled` flag from the session; setup reveals the secret to type
// into Google Authenticator, then a 6-digit code confirms enrollment.
export default function TwoFactorSettings() {
  const { user, refreshUser } = useAuth();
  const enabled = user?.twoFactorEnabled;

  const [stage, setStage] = useState('idle'); // idle | setup
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function startSetup() {
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setStage('setup');
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در راه‌اندازی.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setError('');
    setBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code });
      await refreshUser();
      setStage('idle');
      setCode('');
      setSecret('');
    } catch (err) {
      setError(err.response?.data?.message || 'کد نامعتبر است.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    const c = window.prompt('برای غیرفعال کردن، کد فعلی برنامه احرازکننده را وارد کنید:');
    if (c === null) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/auth/2fa/disable', { code: c });
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'خطا در غیرفعال‌سازی.');
    } finally {
      setBusy(false);
    }
  }

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="card-luxe p-5 max-w-lg">
      <div className="flex items-start gap-3">
        <span
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'
          }`}
        >
          {enabled ? <ShieldCheck size={22} /> : <ShieldOff size={22} />}
        </span>
        <div className="flex-1">
          <h3 className="font-extrabold text-ink flex items-center gap-2">
            احراز هویت دو مرحله‌ای
            {enabled && <span className="chip-gold text-[10px] py-0">فعال</span>}
          </h3>
          <p className="text-sm text-ink/50 mt-1">
            با یک برنامه احرازکننده (Google Authenticator، Authy…) لایه امنیتی دوم به حساب اضافه کن.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-3">{error}</p>}

      {enabled ? (
        <button
          onClick={disable}
          disabled={busy}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-red-600 border border-red-200 hover:bg-red-500 hover:text-white transition-colors rounded-full px-4 py-2"
        >
          <ShieldOff size={15} />
          غیرفعال کردن
        </button>
      ) : stage === 'idle' ? (
        <button onClick={startSetup} disabled={busy} className="btn-gold mt-4 px-5 py-2.5 text-sm">
          <ShieldCheck size={16} />
          {busy ? 'لطفاً صبر کنید…' : 'فعال‌سازی'}
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ink/70">۱) این کلید را در برنامه احرازکننده وارد کن:</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="flex-1 bg-black/[0.04] rounded-xl px-3 py-2.5 text-sm font-mono tracking-wider break-all">
              {secret}
            </code>
            <button
              onClick={copySecret}
              className="w-10 h-10 shrink-0 rounded-xl bg-surface-2/70 border border-black/10 flex items-center justify-center hover:border-accent-300"
              title="کپی"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-ink/50" />}
            </button>
          </div>
          <a href={otpauthUrl} className="text-xs text-accent-700 hover:underline block" dir="ltr">
            افزودن خودکار به برنامه (روی موبایل)
          </a>

          <p className="text-sm text-ink/70 pt-1">۲) کد ۶ رقمی نمایش‌داده‌شده را وارد کن:</p>
          <input
            inputMode="numeric"
            dir="ltr"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="------"
            className="glass-input w-full rounded-xl px-4 py-2.5 text-center text-xl font-black tracking-[0.4em]"
          />
          <div className="flex gap-2">
            <button onClick={confirmEnable} disabled={busy || code.length < 6} className="btn-gold flex-1 py-2.5 text-sm">
              {busy ? 'بررسی…' : 'تایید و فعال‌سازی'}
            </button>
            <button
              onClick={() => { setStage('idle'); setError(''); setCode(''); }}
              className="px-4 text-sm text-ink/50 hover:text-ink"
            >
              انصراف
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
