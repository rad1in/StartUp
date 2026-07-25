import { useEffect, useState } from 'react';
import { Search, Gift, Crown, Users, Send, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

function recencyLabel(days) {
  if (days <= 7) return { text: 'همین اواخر', cls: 'text-green-700 bg-green-50 border-green-200' };
  if (days <= 30) return { text: `${days.toLocaleString('fa-IR')} روز پیش`, cls: 'text-accent-800 bg-accent-50 border-accent-200' };
  return { text: `${days.toLocaleString('fa-IR')} روز پیش`, cls: 'text-red-600 bg-red-50 border-red-200' };
}

function SmartCouponEngine({ venueId }) {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);

  async function refresh() {
    const [{ data: cfg }, { data: logRows }] = await Promise.all([
      api.get(`/venues/${venueId}/smart-coupons/config`),
      api.get(`/venues/${venueId}/smart-coupons/log`),
    ]);
    setConfig(cfg);
    setLog(logRows);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function save(patch) {
    const { data } = await api.patch(`/venues/${venueId}/smart-coupons/config`, { ...config, ...patch });
    setConfig(data);
  }

  async function runNow() {
    setRunning(true);
    try {
      const { data } = await api.post(`/venues/${venueId}/smart-coupons/run`);
      toast.success(`${data.targeted.toLocaleString('fa-IR')} کوپن برای مشتریان غیرفعال ارسال شد.`);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'اجرای موتور کوپن ناموفق بود.');
    } finally {
      setRunning(false);
    }
  }

  if (!config) return null;

  return (
    <div className="card-luxe p-4">
      <h3 className="font-black text-ink text-sm mb-1 flex items-center gap-1.5">
        <Sparkles size={15} />
        موتور کوپن هوشمند
      </h3>
      <p className="text-xs text-ink/45 mb-3">
        هر روز مشتریانی که مدتی سفارش نداده‌اند را شناسایی و برایشان یک کوپن بازگشت اختصاصی ارسال می‌کند.
      </p>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={!!config.isActive} onChange={(e) => save({ isActive: e.target.checked })} />
          فعال
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          غیرفعال بعد از
          <input
            type="number"
            min={1}
            className="glass-input w-16 rounded-lg px-2 py-1 text-xs text-center"
            value={config.inactivityDays}
            onChange={(e) => save({ inactivityDays: Number(e.target.value) })}
          />
          روز
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          تخفیف
          <input
            type="number"
            min={1}
            className="glass-input w-16 rounded-lg px-2 py-1 text-xs text-center"
            value={config.discountValue}
            onChange={(e) => save({ discountValue: Number(e.target.value) })}
          />
          ٪
        </label>
        <label className="flex items-center gap-2 text-xs text-ink/60">
          فاصله بین ارسال‌ها
          <input
            type="number"
            min={1}
            className="glass-input w-16 rounded-lg px-2 py-1 text-xs text-center"
            value={config.cooldownDays}
            onChange={(e) => save({ cooldownDays: Number(e.target.value) })}
          />
          روز
        </label>
        <button
          type="button"
          onClick={runNow}
          disabled={running}
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/60 text-accent-700 border border-accent-200/70 hover:bg-accent-500 hover:text-white transition-all"
        >
          {running ? 'در حال اجرا...' : 'اجرا همین حالا'}
        </button>
      </div>
      <div className="space-y-1.5">
        {log.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-xs bg-ink/[0.03] rounded-lg px-3 py-1.5">
            <span className="text-ink/70">{l.customerName}</span>
            <span className="text-ink/40" dir="ltr">{l.couponCode}</span>
            <span className="text-ink/40">{new Date(l.sentAt).toLocaleDateString('fa-IR')}</span>
          </div>
        ))}
        {log.length === 0 && <p className="text-xs text-ink/35">هنوز کوپنی به‌صورت خودکار ارسال نشده است.</p>}
      </div>
    </div>
  );
}

export default function Crm() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [couponTarget, setCouponTarget] = useState(null);
  const [couponForm, setCouponForm] = useState({ discountType: 'PERCENT', discountValue: 15, message: '' });
  const [sending, setSending] = useState(false);
  const [sentFor, setSentFor] = useState(null);

  async function refresh() {
    setLoading(true);
    try {
      const { data } = await api.get(`/venues/${venueId}/crm/customers`, { params: search ? { search } : {} });
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  useEffect(() => {
    const t = setTimeout(() => venueId && refresh(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function sendCoupon(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api.post(`/venues/${venueId}/crm/customers/${couponTarget.customerId}/coupon`, {
        ...couponForm,
        discountValue: Number(couponForm.discountValue),
      });
      setSentFor(couponTarget.customerId);
      setCouponTarget(null);
      setCouponForm({ discountType: 'PERCENT', discountValue: 15, message: '' });
    } finally {
      setSending(false);
    }
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  const top = customers[0];

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="card-luxe p-4 flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
            <Users size={18} />
          </span>
          <div>
            <p className="text-xs text-ink/50">مشتریان تکراری</p>
            <p className="font-black text-ink text-lg">{customers.length.toLocaleString('fa-IR')}</p>
          </div>
        </div>
        <div className="card-luxe p-4 flex items-center gap-3 sm:col-span-2">
          <span className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
            <Crown size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-ink/50">وفادارترین مشتری</p>
            <p className="font-bold text-ink text-sm truncate">
              {top ? `${top.name} — ${top.orderCount.toLocaleString('fa-IR')} سفارش، ${top.totalSpent.toLocaleString('fa-IR')} تومان` : '—'}
            </p>
          </div>
        </div>
      </div>

      <SmartCouponEngine venueId={venueId} />

      <div className="search-pill">
        <Search size={16} className="text-ink/35 shrink-0" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام، شماره یا ایمیل…" />
      </div>

      {loading && <p className="text-center text-ink/40 text-sm py-8">در حال بارگذاری...</p>}
      {!loading && customers.length === 0 && <p className="text-center text-ink/40 text-sm py-8">هنوز مشتری تکراری‌ای ثبت نشده.</p>}

      <div className="space-y-2.5">
        {customers.map((c) => {
          const rec = recencyLabel(c.recencyDays);
          return (
            <div key={c.customerId} className="card-luxe p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm">{c.name}</p>
                <p className="text-xs text-ink/45 mt-0.5" dir="ltr">{c.phone || c.email}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[11px]">
                  <span className={`px-2 py-0.5 rounded-full border font-bold ${rec.cls}`}>{rec.text}</span>
                  <span className="text-ink/50">{c.orderCount.toLocaleString('fa-IR')} سفارش</span>
                  <span className="text-accent-700 font-bold">{c.totalSpent.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
              <button
                onClick={() => setCouponTarget(c)}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-white/60 text-accent-700 border border-accent-200/70 hover:bg-accent-500 hover:text-white hover:border-accent-500 transition-all active:scale-95"
              >
                <Gift size={14} />
                {sentFor === c.customerId ? 'ارسال شد ✓' : 'ارسال کوپن اختصاصی'}
              </button>
            </div>
          );
        })}
      </div>

      {couponTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setCouponTarget(null)}>
          <form onSubmit={sendCoupon} className="glass-strong rounded-3xl shadow-lift w-full max-w-sm p-6 space-y-4 animate-pop-in" dir="rtl">
            <h3 className="font-black text-ink text-lg">کوپن اختصاصی برای {couponTarget.name}</h3>
            <div className="grid grid-cols-2 gap-3">
              <select
                className="glass-input rounded-xl px-3 py-2.5 text-sm"
                value={couponForm.discountType}
                onChange={(e) => setCouponForm({ ...couponForm, discountType: e.target.value })}
              >
                <option value="PERCENT">درصدی</option>
                <option value="FIXED">مبلغ ثابت</option>
              </select>
              <input
                type="number"
                min={1}
                className="glass-input rounded-xl px-3 py-2.5 text-sm"
                value={couponForm.discountValue}
                onChange={(e) => setCouponForm({ ...couponForm, discountValue: e.target.value })}
              />
            </div>
            <textarea
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm resize-none"
              rows={2}
              placeholder="پیام دلخواه (اختیاری)"
              value={couponForm.message}
              onChange={(e) => setCouponForm({ ...couponForm, message: e.target.value })}
            />
            <div className="flex gap-2">
              <button type="submit" disabled={sending} className="btn-gold flex-1 py-2.5 text-sm">
                <Send size={15} />
                {sending ? 'در حال ارسال…' : 'ارسال'}
              </button>
              <button type="button" onClick={() => setCouponTarget(null)} className="px-4 text-sm text-ink/50 hover:text-ink">
                انصراف
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
