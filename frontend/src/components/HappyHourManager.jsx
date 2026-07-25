import { useEffect, useState } from 'react';
import { Clock3, Plus, Trash2, Zap } from 'lucide-react';
import api from '../services/api';
import { useConfirm } from '../context/ConfirmContext';

const DAYS = [
  { value: 6, label: 'شنبه' },
  { value: 0, label: 'یکشنبه' },
  { value: 1, label: 'دوشنبه' },
  { value: 2, label: 'سه‌شنبه' },
  { value: 3, label: 'چهارشنبه' },
  { value: 4, label: 'پنجشنبه' },
  { value: 5, label: 'جمعه' },
];

const emptyForm = { name: '', daysOfWeek: [], startTime: '15:00', endTime: '18:00', discountPercent: 15 };

// Automatic, no-code time-window discounts for a venue — e.g. "15% off
// 15:00-18:00 on quiet weekdays." Applied server-side at order time; this UI
// is pure CRUD over HappyHourRule.
export default function HappyHourManager({ venueId }) {
  const confirm = useConfirm();
  const [rules, setRules] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const { data } = await api.get(`/venues/${venueId}/happy-hour`);
    setRules(data);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  function toggleDay(d) {
    setForm((f) => ({
      ...f,
      daysOfWeek: f.daysOfWeek.includes(d) ? f.daysOfWeek.filter((x) => x !== d) : [...f.daysOfWeek, d],
    }));
  }

  async function createRule(e) {
    e.preventDefault();
    if (!form.name || !form.discountPercent) return;
    setSaving(true);
    try {
      await api.post(`/venues/${venueId}/happy-hour`, {
        ...form,
        discountPercent: Number(form.discountPercent),
        daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : null,
      });
      setForm(emptyForm);
      refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rule) {
    await api.patch(`/venues/${venueId}/happy-hour/${rule.id}`, { isActive: !rule.isActive });
    refresh();
  }

  async function removeRule(rule) {
    if (!(await confirm('این قانون ساعت شاد حذف شود؟', { danger: true }))) return;
    await api.delete(`/venues/${venueId}/happy-hour/${rule.id}`);
    refresh();
  }

  function dayLabels(daysOfWeek) {
    if (!daysOfWeek) return 'همه روزها';
    const set = new Set(daysOfWeek.split(',').map(Number));
    return DAYS.filter((d) => set.has(d.value)).map((d) => d.label).join('، ');
  }

  return (
    <div className="space-y-4">
      <div className="card-luxe p-5">
        <h3 className="font-extrabold text-ink mb-1 flex items-center gap-2">
          <Zap size={17} className="text-accent-600" />
          ساعت شاد جدید
        </h3>
        <p className="text-xs text-ink/45 mb-4">تخفیف درصدی خودکار در بازه‌ی زمانی مشخص — بدون نیاز به کد تخفیف.</p>
        <form onSubmit={createRule} className="grid sm:grid-cols-2 gap-3">
          <input
            className="glass-input rounded-xl px-3 py-2 text-sm sm:col-span-2"
            placeholder="نام (مثلاً: بعدازظهر آرام)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div>
            <label className="block text-xs font-bold text-ink/50 mb-1">از ساعت</label>
            <input
              type="time"
              className="glass-input rounded-xl px-3 py-2 text-sm w-full"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink/50 mb-1">تا ساعت</label>
            <input
              type="time"
              className="glass-input rounded-xl px-3 py-2 text-sm w-full"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-ink/50 mb-1">روزهای هفته (خالی = همه روزها)</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => (
                <button
                  type="button"
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    form.daysOfWeek.includes(d.value)
                      ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button'
                      : 'bg-surface-2/60 text-ink/55 border border-black/10 hover:text-ink'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink/50 mb-1">درصد تخفیف</label>
            <input
              type="number"
              min={1}
              max={90}
              className="glass-input rounded-xl px-3 py-2 text-sm w-full"
              value={form.discountPercent}
              onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
            />
          </div>
          <button type="submit" disabled={saving} className="btn-gold sm:col-span-2 py-2.5 text-sm mt-1">
            <Plus size={16} />
            {saving ? 'در حال ساخت…' : 'ساخت ساعت شاد'}
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <div key={rule.id} className="card-luxe p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  rule.isActive ? 'bg-accent-100 text-accent-700' : 'bg-black/[0.04] text-ink/30'
                }`}
              >
                <Clock3 size={17} />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm truncate">{rule.name}</p>
                <p className="text-xs text-ink/45 mt-0.5">
                  {rule.startTime.slice(0, 5)}–{rule.endTime.slice(0, 5)} · {dayLabels(rule.daysOfWeek)} ·{' '}
                  <span className="text-accent-700 font-bold">{Number(rule.discountPercent)}٪</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => toggleActive(rule)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  rule.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-ink/50 hover:bg-gray-200'
                }`}
              >
                {rule.isActive ? 'فعال' : 'غیرفعال'}
              </button>
              <button
                onClick={() => removeRule(rule)}
                className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                aria-label="حذف"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <p className="text-center text-ink/40 text-sm py-4">هنوز ساعت شادی تعریف نشده است.</p>}
      </div>
    </div>
  );
}
