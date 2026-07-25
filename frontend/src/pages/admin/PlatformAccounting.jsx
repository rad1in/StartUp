import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';

function PnLBar({ revenue, costs, t }) {
  const max = Math.max(revenue, costs, 1);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20 text-left">{t('admin.platformAccounting.revenue')}</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3">
          <div className="bg-green-500 h-3 rounded-full" style={{ width: `${(revenue / max) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-green-700 w-32 text-right">{Number(revenue).toLocaleString('fa-IR')}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 w-20 text-left">{t('admin.platformAccounting.costs')}</span>
        <div className="flex-1 bg-gray-100 rounded-full h-3">
          <div className="bg-red-400 h-3 rounded-full" style={{ width: `${(costs / max) * 100}%` }} />
        </div>
        <span className="text-xs font-medium text-red-600 w-32 text-right">{Number(costs).toLocaleString('fa-IR')}</span>
      </div>
    </div>
  );
}

export default function PlatformAccounting() {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const COST_CATEGORY_LABELS = {
    SERVER: t('admin.platformAccounting.categoryServer'), PAYMENT_GATEWAY: t('admin.platformAccounting.categoryPaymentGateway'), SMS: t('admin.platformAccounting.categorySms'),
    STAFF: t('admin.platformAccounting.categoryStaff'), MARKETING: t('admin.platformAccounting.categoryMarketing'), OTHER: t('admin.platformAccounting.categoryOther'),
  };
  const GROUP_BY_OPTIONS = [
    { value: 'venue', label: t('admin.platformAccounting.groupByVenue') },
    { value: 'tier', label: t('admin.platformAccounting.groupByTier') },
    { value: 'month', label: t('admin.platformAccounting.groupByMonth') },
  ];

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [groupBy, setGroupBy] = useState('venue');
  const [from, setFrom] = useState(new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10));
  const [to, setTo] = useState(now.toISOString().slice(0, 10));

  const [pnl, setPnl] = useState(null);
  const [yearlyPnL, setYearlyPnL] = useState(null);
  const [commission, setCommission] = useState([]);
  const [costs, setCosts] = useState([]);
  const [costForm, setCostForm] = useState({ category: 'SERVER', description: '', amount: '', periodYear: year, periodMonth: month });
  const [editingCost, setEditingCost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('pnl');

  const loadPnL = useCallback(async () => {
    const [{ data: p }, { data: y }] = await Promise.all([
      api.get('/admin/platform-accounting/pnl', { params: { year, month } }),
      api.get('/admin/platform-accounting/pnl/yearly', { params: { year } }),
    ]);
    setPnl(p); setYearlyPnL(y);
  }, [year, month]);

  const loadCommission = useCallback(async () => {
    const { data } = await api.get('/admin/platform-accounting/commission', { params: { from, to, groupBy } });
    setCommission(data);
  }, [from, to, groupBy]);

  const loadCosts = useCallback(async () => {
    const { data } = await api.get('/admin/platform-accounting/costs', { params: { year, month } });
    setCosts(data);
  }, [year, month]);

  useEffect(() => { loadPnL(); loadCosts(); }, [loadPnL, loadCosts]);
  useEffect(() => { if (activeTab === 'commission') loadCommission(); }, [activeTab, loadCommission]);

  async function saveCost(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editingCost) { await api.patch(`/admin/platform-accounting/costs/${editingCost}`, costForm); setEditingCost(null); }
      else { await api.post('/admin/platform-accounting/costs', costForm); }
      setCostForm({ category: 'SERVER', description: '', amount: '', periodYear: year, periodMonth: month });
      await loadCosts(); await loadPnL();
    } finally { setSaving(false); }
  }

  async function deleteCost(id) {
    if (!(await confirm(t('admin.platformAccounting.confirmDeleteCost'), { danger: true }))) return;
    await api.delete(`/admin/platform-accounting/costs/${id}`);
    await loadCosts(); await loadPnL();
  }

  function exportPnL(format = 'csv') {
    window.open(`/api/admin/platform-accounting/pnl/export?year=${year}&month=${month}&format=${format}`, '_blank');
  }
  function exportYearly(format = 'csv') {
    window.open(`/api/admin/platform-accounting/pnl/export?year=${year}&format=${format}`, '_blank');
  }

  const tabs = [
    { id: 'pnl', label: t('admin.platformAccounting.tabMonthlyPnl') },
    { id: 'yearly', label: t('admin.platformAccounting.tabYearlyPnl') },
    { id: 'commission', label: t('admin.platformAccounting.tabCommissionBreakdown') },
    { id: 'costs', label: t('admin.platformAccounting.tabOperatingCosts') },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {tabs.map((tb) => (
          <button key={tb.id} onClick={() => setActiveTab(tb.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === tb.id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* P&L monthly */}
      {activeTab === 'pnl' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
            <button onClick={() => exportPnL('csv')} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">↓ CSV</button>
            <button onClick={() => exportPnL('xlsx')} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-green-700">↓ Excel</button>
          </div>
          {pnl && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.commissionRevenue')}</p><p className="text-lg font-bold text-green-700">{Number(pnl.commissionRevenue).toLocaleString('fa-IR')}</p></Card>
                <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.totalCosts')}</p><p className="text-lg font-bold text-red-600">{Number(pnl.totalCosts).toLocaleString('fa-IR')}</p></Card>
                <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.netProfit')}</p><p className={`text-lg font-bold ${pnl.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{Number(pnl.netProfit).toLocaleString('fa-IR')}</p></Card>
                <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.margin')}</p><p className={`text-lg font-bold ${pnl.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{pnl.margin}٪</p></Card>
              </div>
              <Card>
                <h3 className="font-semibold text-gray-800 mb-4">{t('admin.platformAccounting.revenueVsCostsChart')}</h3>
                <PnLBar revenue={pnl.commissionRevenue} costs={pnl.totalCosts} t={t} />
              </Card>
              {Object.keys(pnl.costBreakdown).length > 0 && (
                <Card>
                  <h3 className="font-semibold text-gray-800 mb-3">{t('admin.platformAccounting.costBreakdown')}</h3>
                  <div className="space-y-2">
                    {Object.entries(pnl.costBreakdown).map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="text-gray-600">{COST_CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-medium">{Number(amount).toLocaleString('fa-IR')} {t('common.toman')}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Yearly P&L */}
      {activeTab === 'yearly' && yearlyPnL && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={() => exportYearly('csv')} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-gray-600">↓ CSV</button>
            <button onClick={() => exportYearly('xlsx')} className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50 text-green-700">↓ Excel</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.yearlyRevenue')}</p><p className="text-lg font-bold text-green-700">{Number(yearlyPnL.totals.commissionRevenue).toLocaleString('fa-IR')}</p></Card>
            <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.yearlyCosts')}</p><p className="text-lg font-bold text-red-600">{Number(yearlyPnL.totals.totalCosts).toLocaleString('fa-IR')}</p></Card>
            <Card><p className="text-xs text-gray-500">{t('admin.platformAccounting.yearlyNetProfit')}</p><p className={`text-lg font-bold ${yearlyPnL.totals.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{Number(yearlyPnL.totals.netProfit).toLocaleString('fa-IR')}</p></Card>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-right">
              <thead><tr className="text-xs text-gray-500 border-b">
                <th className="pb-2">{t('admin.platformAccounting.month')}</th><th className="pb-2">{t('admin.platformAccounting.revenue')}</th><th className="pb-2">{t('admin.platformAccounting.costs')}</th><th className="pb-2">{t('admin.platformAccounting.netProfit')}</th><th className="pb-2">{t('admin.platformAccounting.margin')}</th>
              </tr></thead>
              <tbody>
                {yearlyPnL.months.map((m) => (
                  <tr key={m.month} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{m.month}</td>
                    <td className="py-2 text-green-700">{Number(m.commissionRevenue).toLocaleString('fa-IR')}</td>
                    <td className="py-2 text-red-600">{Number(m.totalCosts).toLocaleString('fa-IR')}</td>
                    <td className={`py-2 font-medium ${m.netProfit >= 0 ? 'text-primary-700' : 'text-red-600'}`}>{Number(m.netProfit).toLocaleString('fa-IR')}</td>
                    <td className="py-2">{m.margin}٪</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Commission breakdown */}
      {activeTab === 'commission' && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            <span className="text-gray-400 text-sm">{t('admin.platformAccounting.toWord')}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {GROUP_BY_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
            <Button onClick={loadCommission}>{t('admin.platformAccounting.apply')}</Button>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-sm text-right">
              <thead><tr className="text-xs text-gray-500 border-b">
                <th className="pb-2">{t('admin.platformAccounting.group')}</th><th className="pb-2">{t('admin.platformAccounting.orders')}</th><th className="pb-2">GMV</th><th className="pb-2">{t('admin.platformAccounting.commission')}</th><th className="pb-2">{t('admin.platformAccounting.avgCommission')}</th>
              </tr></thead>
              <tbody>
                {commission.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{r.label}</td>
                    <td className="py-2">{Number(r.orders).toLocaleString('fa-IR')}</td>
                    <td className="py-2">{Number(r.gmv).toLocaleString('fa-IR')}</td>
                    <td className="py-2 text-green-700 font-medium">{Number(r.commission).toLocaleString('fa-IR')}</td>
                    <td className="py-2">{Number(r.avgCommissionPerOrder).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Costs management */}
      {activeTab === 'costs' && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </div>
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">{editingCost ? t('admin.platformAccounting.editCost') : t('admin.platformAccounting.recordOperatingCost')}</h3>
            <form onSubmit={saveCost} className="grid sm:grid-cols-2 gap-3">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={costForm.category} onChange={(e) => setCostForm({ ...costForm, category: e.target.value })} required>
                {Object.entries(COST_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.platformAccounting.costDescription')} value={costForm.description} onChange={(e) => setCostForm({ ...costForm, description: e.target.value })} required />
              <input type="number" step="0.01" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.platformAccounting.amountToman')} value={costForm.amount} onChange={(e) => setCostForm({ ...costForm, amount: e.target.value })} required />
              <div className="grid grid-cols-2 gap-2">
                <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.platformAccounting.year')} value={costForm.periodYear} onChange={(e) => setCostForm({ ...costForm, periodYear: Number(e.target.value) })} required />
                <input type="number" min="1" max="12" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.platformAccounting.monthOneToTwelve')} value={costForm.periodMonth} onChange={(e) => setCostForm({ ...costForm, periodMonth: Number(e.target.value) })} required />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button type="submit" disabled={saving}>{editingCost ? t('admin.platformAccounting.update') : t('admin.platformAccounting.recordCost')}</Button>
                {editingCost && <Button type="button" variant="ghost" onClick={() => { setEditingCost(null); setCostForm({ category: 'SERVER', description: '', amount: '', periodYear: year, periodMonth: month }); }}>{t('common.cancel')}</Button>}
              </div>
            </form>
          </Card>
          <div className="space-y-2">
            {costs.map((c) => (
              <Card key={c.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.description}</p>
                  <p className="text-xs text-gray-500">{COST_CATEGORY_LABELS[c.category] || c.category} — {c.periodYear}/{c.periodMonth}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">{Number(c.amount).toLocaleString('fa-IR')} {t('common.toman')}</span>
                  <Button variant="ghost" onClick={() => { setEditingCost(c.id); setCostForm({ category: c.category, description: c.description, amount: c.amount, periodYear: c.periodYear, periodMonth: c.periodMonth }); }}>{t('common.edit')}</Button>
                  <Button variant="danger" onClick={() => deleteCost(c.id)}>{t('common.delete')}</Button>
                </div>
              </Card>
            ))}
            {costs.length === 0 && <p className="text-gray-500 text-sm">{t('admin.platformAccounting.noCostsForMonth')}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
