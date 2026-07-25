import { useEffect, useState } from 'react';
import { Sparkles, Users, Wallet, Percent, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

function StatCard({ icon: Icon, label, value }) {
  return (
    <Card className="flex items-center gap-3">
      <span className="w-11 h-11 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-lg font-black text-ink leading-none">{value}</p>
        <p className="text-xs text-ink/50 mt-1">{label}</p>
      </div>
    </Card>
  );
}

export default function Subscriptions() {
  const { t } = useLanguage();
  const [plan, setPlan] = useState(null);
  const [stats, setStats] = useState(null);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priceInput, setPriceInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  async function refresh() {
    setLoading(true);
    const [{ data: planData }, { data: statsData }, { data: listData }] = await Promise.all([
      api.get('/subscription/plan'),
      api.get('/subscription/admin/stats'),
      api.get('/subscription/admin/list'),
    ]);
    setPlan(planData);
    setPriceInput(String(planData.price));
    setStats(statsData);
    setList(listData);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function savePlan(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await api.patch('/subscription/admin/plan', { price: Number(priceInput) });
      setMsg(t('admin.subscriptions.saved'));
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled() {
    setSaving(true);
    try {
      await api.patch('/subscription/admin/plan', { enabled: !plan.enabled });
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="skeleton h-40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-ink flex items-center gap-2">
          <Sparkles size={20} className="text-accent-600" />
          {t('admin.subscriptions.title')}
        </h1>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={saving}
          className={`chip-gold ${!plan.enabled ? 'opacity-50' : ''}`}
        >
          {plan.enabled ? t('admin.subscriptions.enabledClickToDisable') : t('admin.subscriptions.disabledClickToEnable')}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label={t('admin.subscriptions.activeSubscribers')} value={stats.activeSubscribers.toLocaleString('fa-IR')} />
        <StatCard icon={Wallet} label={t('admin.subscriptions.totalSubscriptionRevenue')} value={`${stats.totalRevenue.toLocaleString('fa-IR')} ${t('admin.subscriptions.tomanAbbr')}`} />
        <StatCard icon={TrendingUp} label={t('admin.subscriptions.totalSalesCount')} value={stats.totalSubscriptionsSold.toLocaleString('fa-IR')} />
        <StatCard
          icon={Percent}
          label={t('admin.subscriptions.averageDiscountGiven')}
          value={`${stats.averageDiscountPercent.toLocaleString('fa-IR')}٪`}
        />
      </div>

      <Card>
        <h2 className="font-bold text-ink mb-3">{t('admin.subscriptions.subscriptionPrice30Days')}</h2>
        <form onSubmit={savePlan} className="flex items-center gap-3 flex-wrap">
          <input
            type="number"
            step="1000"
            min="0"
            className="glass-input rounded-xl px-3 py-2 text-sm w-48"
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          <span className="text-sm text-ink/50">{t('common.toman')}</span>
          <Button type="submit" disabled={saving}>
            {saving ? t('admin.subscriptions.saving') : t('common.save')}
          </Button>
          {msg && <span className="text-sm text-green-600">{msg}</span>}
        </form>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-bold text-ink px-4 pt-4 mb-3">{t('admin.subscriptions.latestSubscribers')}</h2>
        {list.length === 0 ? (
          <p className="text-sm text-ink/40 px-4 pb-4">{t('admin.subscriptions.noOneSubscribedYet')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right text-xs text-ink/40 border-b border-ink/10">
                  <th className="px-4 py-2 font-medium">{t('admin.subscriptions.customerColumn')}</th>
                  <th className="px-4 py-2 font-medium">{t('common.status')}</th>
                  <th className="px-4 py-2 font-medium">{t('admin.subscriptions.amountColumn')}</th>
                  <th className="px-4 py-2 font-medium">{t('admin.subscriptions.bigDiscountsColumn')}</th>
                  <th className="px-4 py-2 font-medium">{t('admin.subscriptions.startColumn')}</th>
                  <th className="px-4 py-2 font-medium">{t('admin.subscriptions.endColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-ink">{s.userName}</p>
                      <p className="text-xs text-ink/40">{s.userEmail}</p>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          s.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {s.status === 'ACTIVE' ? t('common.active') : s.status === 'EXPIRED' ? t('admin.subscriptions.expired') : t('admin.subscriptions.cancelled')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink/70">{Number(s.pricePaid).toLocaleString('fa-IR')} {t('admin.subscriptions.tomanAbbr')}</td>
                    <td className="px-4 py-2.5 text-ink/70">{s.highDiscountCount}</td>
                    <td className="px-4 py-2.5 text-ink/50 text-xs">
                      {new Date(s.startsAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="px-4 py-2.5 text-ink/50 text-xs">
                      {new Date(s.expiresAt).toLocaleDateString('fa-IR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
