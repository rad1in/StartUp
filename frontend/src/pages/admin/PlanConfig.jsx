import { useCallback, useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

const FEATURE_KEYS = [
  { key: 'maxMenuItems',      label: 'حداکثر آیتم منو (null=نامحدود)', type: 'number_or_null' },
  { key: 'multiBranch',       label: 'چند شعبه',           type: 'bool' },
  { key: 'inventoryTracking', label: 'مدیریت انبار',        type: 'bool' },
  { key: 'aiForecasting',     label: 'پیش‌بینی هوشمند',    type: 'bool' },
  { key: 'advancedAnalytics', label: 'گزارش پیشرفته',      type: 'bool' },
  { key: 'apiAccess',         label: 'دسترسی API',          type: 'bool' },
  { key: 'trialEligible',     label: 'واجد آزمایش رایگان', type: 'bool' },
  { key: 'supportLevel',      label: 'سطح پشتیبانی',       type: 'select', options: ['email', 'priority', 'dedicated'] },
];

const TIER_LABELS = { FREE: 'رایگان', PRO: 'حرفه‌ای', ULTRA: 'حرفه‌ای‌پلاس' };

function PlanEditor({ plan, onSave }) {
  const [form, setForm] = useState({
    commissionRate: plan.commissionRate,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    yearlyDiscountPct: plan.yearlyDiscountPct,
    trialDays: plan.trialDays,
    features: { ...plan.features },
  });
  const [saving, setSaving] = useState(false);

  function setFeature(key, value) {
    setForm((f) => ({ ...f, features: { ...f.features, [key]: value } }));
  }

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/plans/${plan.tier}`, form);
      onSave();
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 block mb-1">نرخ کارمزد (مثال: 0.05 برای ۵٪)</label>
          <input type="number" step="0.001" min="0" max="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">قیمت ماهانه (تومان)</label>
          <input type="number" step="1000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">قیمت سالانه (تومان)</label>
          <input type="number" step="1000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">درصد تخفیف سالانه</label>
          <input type="number" step="0.01" min="0" max="100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.yearlyDiscountPct} onChange={(e) => setForm({ ...form, yearlyDiscountPct: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">روزهای آزمایشی</label>
          <input type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">ویژگی‌ها</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {FEATURE_KEYS.map((fk) => (
            <div key={fk.key} className="flex items-center gap-2">
              {fk.type === 'bool' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={!!form.features[fk.key]}
                    onChange={(e) => setFeature(fk.key, e.target.checked)} />
                  <span className="text-sm text-gray-700">{fk.label}</span>
                </label>
              ) : fk.type === 'select' ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-sm text-gray-700 flex-shrink-0">{fk.label}:</span>
                  <select className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm" value={form.features[fk.key] || ''}
                    onChange={(e) => setFeature(fk.key, e.target.value)}>
                    {fk.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-sm text-gray-700 flex-shrink-0">{fk.label}:</span>
                  <input type="text" className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                    placeholder="null یا عدد"
                    value={form.features[fk.key] == null ? 'null' : String(form.features[fk.key])}
                    onChange={(e) => setFeature(fk.key, e.target.value === 'null' ? null : Number(e.target.value))} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={saving}>ذخیره تغییرات پلن {TIER_LABELS[plan.tier]}</Button>
    </form>
  );
}

export default function PlanConfig() {
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState(null);
  const [trialForm, setTrialForm] = useState({});
  const [savingTrial, setSavingTrial] = useState(false);
  const [expandedTier, setExpandedTier] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: p }, { data: t }] = await Promise.all([
      api.get('/plans'),
      api.get('/plans/trial-settings'),
    ]);
    setPlans(p);
    setTrialSettings(t);
    setTrialForm(t);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveTrialSettings(e) {
    e.preventDefault(); setSavingTrial(true);
    try {
      await api.patch('/plans/trial-settings', trialForm);
      setMsg('تنظیمات آزمایشی ذخیره شد.');
      await load();
    } finally { setSavingTrial(false); }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">مدیریت پلن‌های اشتراک</h2>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      {/* Plan editors */}
      {plans.map((plan) => (
        <Card key={plan.tier}>
          <button className="w-full flex items-center justify-between" onClick={() => setExpandedTier(expandedTier === plan.tier ? null : plan.tier)}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">{plan.name} ({plan.tier})</span>
              <span className="text-sm text-gray-500">کارمزد: {(plan.commissionRate * 100).toFixed(1)}٪</span>
              {plan.monthlyPrice > 0 && <span className="text-sm text-gray-500">ماهانه: {Number(plan.monthlyPrice).toLocaleString('fa-IR')} تومان</span>}
            </div>
            {expandedTier === plan.tier ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {expandedTier === plan.tier && (
            <div className="mt-4 pt-4 border-t">
              <PlanEditor plan={plan} onSave={() => { setMsg(`پلن ${plan.name} بروزرسانی شد.`); load(); }} />
            </div>
          )}
        </Card>
      ))}

      {/* Trial settings */}
      {trialSettings && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">تنظیمات دوره آزمایشی</h3>
          <form onSubmit={saveTrialSettings} className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">روزهای کوتاه (زیر آستانه)</label>
              <input type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.shortDays ?? ''} onChange={(e) => setTrialForm({ ...trialForm, shortDays: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">مجموعه‌هایی که فروش کمتری دارند</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">روزهای بلند (بالای آستانه)</label>
              <input type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.longDays ?? ''} onChange={(e) => setTrialForm({ ...trialForm, longDays: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">مجموعه‌هایی که فروش بالاتری دارند</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">آستانه درآمد (تومان)</label>
              <input type="number" step="100000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.revenueThreshold ?? ''} onChange={(e) => setTrialForm({ ...trialForm, revenueThreshold: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">فروش طی دوره آزمایشی برای تمدید</p>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={savingTrial}>ذخیره تنظیمات آزمایشی</Button>
            </div>
          </form>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">منطق دوره آزمایشی پویا</p>
            <p className="text-xs text-blue-600 mt-1">
              آزمایش همیشه با حداکثر مدت ({trialSettings.longDays} روز) شروع می‌شود.
              اگر در پایان دوره، درآمد مجموعه کمتر از {Number(trialSettings.revenueThreshold).toLocaleString('fa-IR')} تومان باشد،
              تاریخ انقضای مؤثر به {trialSettings.shortDays} روز کاهش می‌یابد.
              این محاسبه لحظه‌ای است و نیازی به کرون‌جاب ندارد.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
