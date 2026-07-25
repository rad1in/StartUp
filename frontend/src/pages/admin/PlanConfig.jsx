import { useCallback, useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

function PlanEditor({ plan, onSave }) {
  const { t } = useLanguage();
  const FEATURE_KEYS = [
    { key: 'maxMenuItems',      label: t('admin.planConfig.maxMenuItems'), type: 'number_or_null' },
    { key: 'multiBranch',       label: t('admin.planConfig.multiBranch'),           type: 'bool' },
    { key: 'inventoryTracking', label: t('admin.planConfig.inventoryTracking'),        type: 'bool' },
    { key: 'aiForecasting',     label: t('admin.planConfig.aiForecasting'),    type: 'bool' },
    { key: 'advancedAnalytics', label: t('admin.planConfig.advancedAnalytics'),      type: 'bool' },
    { key: 'apiAccess',         label: t('admin.planConfig.apiAccess'),          type: 'bool' },
    { key: 'trialEligible',     label: t('admin.planConfig.trialEligible'), type: 'bool' },
    { key: 'supportLevel',      label: t('admin.planConfig.supportLevel'),       type: 'select', options: ['email', 'priority', 'dedicated'] },
  ];
  const TIER_LABELS = { FREE: t('admin.planConfig.tierFree'), PRO: t('admin.planConfig.tierPro'), ULTRA: t('admin.planConfig.tierUltra') };
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
          <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.commissionRate')}</label>
          <input type="number" step="0.001" min="0" max="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.monthlyPriceToman')}</label>
          <input type="number" step="1000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.monthlyPrice} onChange={(e) => setForm({ ...form, monthlyPrice: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.yearlyPriceToman')}</label>
          <input type="number" step="1000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.yearlyPrice} onChange={(e) => setForm({ ...form, yearlyPrice: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.yearlyDiscountPct')}</label>
          <input type="number" step="0.01" min="0" max="100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.yearlyDiscountPct} onChange={(e) => setForm({ ...form, yearlyDiscountPct: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.trialDays')}</label>
          <input type="number" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-500 mb-2">{t('admin.planConfig.features')}</p>
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
                    placeholder={t('admin.planConfig.nullOrNumberPlaceholder')}
                    value={form.features[fk.key] == null ? 'null' : String(form.features[fk.key])}
                    onChange={(e) => setFeature(fk.key, e.target.value === 'null' ? null : Number(e.target.value))} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={saving}>{t('admin.planConfig.saveChangesForPlan')} {TIER_LABELS[plan.tier]}</Button>
    </form>
  );
}

export default function PlanConfig() {
  const { t } = useLanguage();
  const TIER_LABELS = { FREE: t('admin.planConfig.tierFree'), PRO: t('admin.planConfig.tierPro'), ULTRA: t('admin.planConfig.tierUltra') };
  const [plans, setPlans] = useState([]);
  const [trialSettings, setTrialSettings] = useState(null);
  const [trialForm, setTrialForm] = useState({});
  const [savingTrial, setSavingTrial] = useState(false);
  const [expandedTier, setExpandedTier] = useState(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: p }, { data: t2 }] = await Promise.all([
      api.get('/plans'),
      api.get('/plans/trial-settings'),
    ]);
    setPlans(p);
    setTrialSettings(t2);
    setTrialForm(t2);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveTrialSettings(e) {
    e.preventDefault(); setSavingTrial(true);
    try {
      await api.patch('/plans/trial-settings', trialForm);
      setMsg(t('admin.planConfig.trialSettingsSaved'));
      await load();
    } finally { setSavingTrial(false); }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">{t('admin.planConfig.title')}</h2>
      {msg && <p className="text-green-600 text-sm">{msg}</p>}

      {/* Plan editors */}
      {plans.map((plan) => (
        <Card key={plan.tier}>
          <button className="w-full flex items-center justify-between" onClick={() => setExpandedTier(expandedTier === plan.tier ? null : plan.tier)}>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-800">{plan.name} ({plan.tier})</span>
              <span className="text-sm text-gray-500">{t('admin.planConfig.commissionLabel')}: {(plan.commissionRate * 100).toFixed(1)}٪</span>
              {plan.monthlyPrice > 0 && <span className="text-sm text-gray-500">{t('admin.planConfig.monthlyLabel')}: {Number(plan.monthlyPrice).toLocaleString('fa-IR')} {t('common.toman')}</span>}
            </div>
            {expandedTier === plan.tier ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>
          {expandedTier === plan.tier && (
            <div className="mt-4 pt-4 border-t">
              <PlanEditor plan={plan} onSave={() => { setMsg(`${t('admin.planConfig.planUpdated')} ${plan.name}`); load(); }} />
            </div>
          )}
        </Card>
      ))}

      {/* Trial settings */}
      {trialSettings && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-4">{t('admin.planConfig.trialSettingsTitle')}</h3>
          <form onSubmit={saveTrialSettings} className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.shortDays')}</label>
              <input type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.shortDays ?? ''} onChange={(e) => setTrialForm({ ...trialForm, shortDays: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">{t('admin.planConfig.shortDaysHint')}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.longDays')}</label>
              <input type="number" min="1" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.longDays ?? ''} onChange={(e) => setTrialForm({ ...trialForm, longDays: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">{t('admin.planConfig.longDaysHint')}</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t('admin.planConfig.revenueThreshold')}</label>
              <input type="number" step="100000" min="0" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={trialForm.revenueThreshold ?? ''} onChange={(e) => setTrialForm({ ...trialForm, revenueThreshold: Number(e.target.value) })} />
              <p className="text-xs text-gray-400 mt-1">{t('admin.planConfig.revenueThresholdHint')}</p>
            </div>
            <div className="sm:col-span-3">
              <Button type="submit" disabled={savingTrial}>{t('admin.planConfig.saveTrialSettings')}</Button>
            </div>
          </form>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-700 font-medium">{t('admin.planConfig.dynamicTrialLogicTitle')}</p>
            <p className="text-xs text-blue-600 mt-1">
              {t('admin.planConfig.dynamicTrialLogicPart1')} ({trialSettings.longDays} {t('admin.planConfig.daysWord')}) {t('admin.planConfig.dynamicTrialLogicPart2')}
              {' '}{Number(trialSettings.revenueThreshold).toLocaleString('fa-IR')} {t('common.toman')} {t('admin.planConfig.dynamicTrialLogicPart3')}
              {' '}{trialSettings.shortDays} {t('admin.planConfig.dynamicTrialLogicPart4')}
              {' '}{t('admin.planConfig.dynamicTrialLogicPart5')}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
