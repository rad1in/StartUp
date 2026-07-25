import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

const TIER_LABELS = { FREE: 'رایگان', PRO: 'حرفه‌ای', ULTRA: 'ویژه' };
const TIER_COLORS = { FREE: 'bg-gray-200 text-gray-700', PRO: 'bg-blue-100 text-blue-700', ULTRA: 'bg-purple-100 text-purple-700' };
const GRANULARITY = [
  { value: 'day', label: 'روزانه' }, { value: 'week', label: 'هفتگی' },
  { value: 'month', label: 'ماهانه' }, { value: 'year', label: 'سالانه' },
];
const EXPORT_TYPES = [
  { value: 'overview_trend', label: 'روند درآمد' },
  { value: 'by_venue', label: 'تفکیک مجموعه' },
  { value: 'by_tier', label: 'تفکیک سطح اشتراک' },
  { value: 'by_city', label: 'تفکیک شهر' },
  { value: 'venue_activity', label: 'فعالیت مجموعه‌ها' },
  { value: 'cohorts', label: 'کوهورت مشتریان' },
];

function TrendBarChart({ data, valueKey = 'gmv' }) {
  if (!data?.length) return <p className="text-gray-400 text-sm">داده‌ای موجود نیست.</p>;
  const max = Math.max(...data.map((d) => Number(d[valueKey])), 1);
  const w = 560; const h = 120; const bw = w / data.length - 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
      {data.map((d, i) => {
        const bh = (Number(d[valueKey]) / max) * (h - 24);
        return (
          <g key={d.period || i}>
            <rect x={i * (w / data.length) + 2} y={h - bh - 16} width={bw} height={bh} fill="#26241F" rx={3} opacity={0.8} />
            {data.length <= 14 && (
              <text x={i * (w / data.length) + bw / 2 + 2} y={h - 3} fontSize="7" textAnchor="middle" fill="#9ca3af">
                {String(d.period).slice(-5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function KPICard({ label, value, sub, color = 'text-gray-900', changePct }) {
  const hasChange = changePct !== undefined && changePct !== null && Number.isFinite(changePct);
  const positive = hasChange && changePct >= 0;
  return (
    <Card>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color}`}>{value}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
        {hasChange && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {positive ? '▲' : '▼'} {Math.abs(changePct).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪
          </span>
        )}
      </div>
    </Card>
  );
}

// % change vs the previous period, or null if the base was zero (undefined).
function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!p) return null;
  return ((c - p) / p) * 100;
}

function DrillDownModal({ dimension, id, label, from, to, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/admin/bi/drill-down', { params: { dimension, id, from, to, limit: 50 } })
      .then(({ data }) => setRows(data))
      .finally(() => setLoading(false));
  }, [dimension, id, from, to]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-800">جزئیات: {label}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-1 rounded" aria-label="بستن"><X size={18} /></button>
        </div>
        <div className="overflow-auto flex-1 p-4">
          {loading ? <p className="text-gray-400 text-sm text-center py-6">در حال بارگذاری...</p> : (
            <table className="w-full text-sm text-right">
              <thead><tr className="text-xs text-gray-500 border-b">{Object.keys(rows[0] || {}).map((k) => <th key={k} className="pb-2 pr-2">{k}</th>)}</tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    {Object.values(r).map((v, j) => <td key={j} className="py-1.5 pr-2 text-gray-700">{typeof v === 'number' ? Number(v).toLocaleString('fa-IR') : v != null ? String(v) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && rows.length === 0 && <p className="text-gray-400 text-sm text-center py-6">داده‌ای یافت نشد.</p>}
        </div>
      </div>
    </div>
  );
}

export default function BI() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10);

  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [granularity, setGranularity] = useState('day');
  const [activeTab, setActiveTab] = useState('overview');
  const [drill, setDrill] = useState(null);

  const [overview, setOverview] = useState(null);
  const [prevOverview, setPrevOverview] = useState(null);
  const [comparePrev, setComparePrev] = useState(true);
  const [trend, setTrend] = useState([]);
  const [byTier, setByTier] = useState([]);
  const [byVenue, setByVenue] = useState([]);
  const [byCity, setByCity] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [venueActivity, setVenueActivity] = useState([]);
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = { from, to };
      // Previous period of equal length, immediately preceding `from` — lets
      // every KPI show a ▲/▼ delta instead of a number in a vacuum.
      const spanMs = new Date(`${to}T23:59:59`) - new Date(`${from}T00:00:00`);
      const prevTo = new Date(new Date(`${from}T00:00:00`) - 86400e3).toISOString().slice(0, 10);
      const prevFrom = new Date(new Date(`${from}T00:00:00`) - 86400e3 - spanMs).toISOString().slice(0, 10);

      const [ov, tr, bt, bv, bc, co, va, prevOv, fn] = await Promise.all([
        api.get('/admin/bi/overview', { params: p }),
        api.get('/admin/bi/trend', { params: { ...p, granularity } }),
        api.get('/admin/bi/by-tier', { params: p }),
        api.get('/admin/bi/by-venue', { params: { ...p, limit: 20 } }),
        api.get('/admin/bi/by-city', { params: p }),
        api.get('/admin/bi/cohorts', { params: p }),
        api.get('/admin/bi/venue-activity', { params: p }),
        api.get('/admin/bi/overview', { params: { from: prevFrom, to: prevTo } }),
        api.get('/admin/bi/funnel', { params: p }),
      ]);
      setOverview(ov.data); setTrend(tr.data); setByTier(bt.data);
      setByVenue(bv.data); setByCity(bc.data); setCohorts(co.data); setVenueActivity(va.data);
      setPrevOverview(prevOv.data); setFunnel(fn.data);
    } finally { setLoading(false); }
  }, [from, to, granularity]);

  useEffect(() => { load(); }, [load]);

  function exportCSV(type, format = 'csv') {
    const params = new URLSearchParams({ type, from, to, granularity, format });
    window.open(`/api/admin/bi/export?${params}`, '_blank');
  }

  const tabs = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'trend', label: 'روند درآمد' },
    { id: 'breakdown', label: 'تفکیک' },
    { id: 'cohorts', label: 'کوهورت' },
    { id: 'venues', label: 'مجموعه‌ها' },
    { id: 'funnel', label: 'قیف تبدیل' },
  ];

  return (
    <div className="space-y-5">
      {drill && <DrillDownModal {...drill} from={from} to={to} onClose={() => setDrill(null)} />}

      {/* Date + controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        <span className="text-gray-400 text-sm">تا</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
        <select value={granularity} onChange={(e) => setGranularity(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          {GRANULARITY.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <Button onClick={load} disabled={loading}>{loading ? 'در حال بارگذاری...' : 'بروزرسانی'}</Button>
        <div className="mr-auto flex gap-2 flex-wrap">
          {EXPORT_TYPES.map((t) => (
            <div key={t.value} className="flex border border-gray-300 rounded overflow-hidden">
              <button onClick={() => exportCSV(t.value, 'csv')}
                className="text-xs px-2 py-1 hover:bg-gray-50 text-gray-600 border-l border-gray-300">
                ↓ {t.label} CSV
              </button>
              <button onClick={() => exportCSV(t.value, 'xlsx')}
                className="text-xs px-2 py-1 hover:bg-gray-50 text-green-700">
                Excel
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap border-b pb-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.id ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer w-fit">
            <input type="checkbox" checked={comparePrev} onChange={(e) => setComparePrev(e.target.checked)} />
            مقایسه با دوره قبل (به همین طول)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KPICard
              label="GMV کل" value={`${Number(overview.gmv).toLocaleString('fa-IR')} تومان`} color="text-primary-700"
              changePct={comparePrev && prevOverview ? pctChange(overview.gmv, prevOverview.gmv) : undefined}
            />
            <KPICard
              label="درآمد کمیسیون" value={`${Number(overview.commissionRevenue).toLocaleString('fa-IR')} تومان`} color="text-green-700"
              changePct={comparePrev && prevOverview ? pctChange(overview.commissionRevenue, prevOverview.commissionRevenue) : undefined}
            />
            <KPICard
              label="کل سفارش‌ها" value={Number(overview.totalOrders).toLocaleString('fa-IR')}
              changePct={comparePrev && prevOverview ? pctChange(overview.totalOrders, prevOverview.totalOrders) : undefined}
            />
            <KPICard
              label="میانگین سفارش" value={`${Math.round(Number(overview.avgOrderValue)).toLocaleString('fa-IR')} تومان`}
              changePct={comparePrev && prevOverview ? pctChange(overview.avgOrderValue, prevOverview.avgOrderValue) : undefined}
            />
            <KPICard
              label="مجموعه‌های فعال" value={Number(overview.activeVenues).toLocaleString('fa-IR')}
              changePct={comparePrev && prevOverview ? pctChange(overview.activeVenues, prevOverview.activeVenues) : undefined}
            />
            <KPICard
              label="مشتریان یکتا" value={Number(overview.uniqueCustomers).toLocaleString('fa-IR')}
              changePct={comparePrev && prevOverview ? pctChange(overview.uniqueCustomers, prevOverview.uniqueCustomers) : undefined}
            />
          </div>
          {comparePrev && prevOverview && (
            <p className="text-[11px] text-gray-400">
              دوره قبل برای مقایسه: {new Date(new Date(`${from}T00:00:00`) - 86400e3 - (new Date(`${to}T23:59:59`) - new Date(`${from}T00:00:00`))).toLocaleDateString('fa-IR')}
              {' '}تا{' '}
              {new Date(new Date(`${from}T00:00:00`) - 86400e3).toLocaleDateString('fa-IR')}
            </p>
          )}
        </div>
      )}

      {/* Trend */}
      {activeTab === 'trend' && (
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">روند GMV</h3>
              <button onClick={() => exportCSV('overview_trend')} className="text-xs text-primary-600">↓ دانلود CSV</button>
            </div>
            <TrendBarChart data={trend} valueKey="gmv" />
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">روند کمیسیون</h3>
            <TrendBarChart data={trend} valueKey="commission" />
          </Card>
          <div className="overflow-auto">
            <table className="w-full text-sm text-right">
              <thead><tr className="text-xs text-gray-500 border-b">
                <th className="pb-2">دوره</th><th className="pb-2">سفارش‌ها</th><th className="pb-2">GMV</th><th className="pb-2">کمیسیون</th>
              </tr></thead>
              <tbody>
                {trend.map((r) => (
                  <tr key={r.period} className="border-b hover:bg-gray-50">
                    <td className="py-1.5 font-medium">{r.period}</td>
                    <td className="py-1.5">{Number(r.orders).toLocaleString('fa-IR')}</td>
                    <td className="py-1.5">{Number(r.gmv).toLocaleString('fa-IR')}</td>
                    <td className="py-1.5 text-green-700">{Number(r.commission).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Breakdown */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">تفکیک بر اساس سطح اشتراک</h3>
            <div className="space-y-2">
              {byTier.map((r) => (
                <div key={r.tier} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${TIER_COLORS[r.tier]}`}>{TIER_LABELS[r.tier] || r.tier}</span>
                  <span className="text-xs text-gray-500">{r.venueCount} مجموعه</span>
                  <span className="text-xs text-gray-500">{Number(r.orders).toLocaleString('fa-IR')} سفارش</span>
                  <span className="text-sm font-medium text-gray-900 mr-auto">{Number(r.gmv).toLocaleString('fa-IR')} تومان GMV</span>
                  <span className="text-sm font-medium text-green-700">{Number(r.commission).toLocaleString('fa-IR')} تومان کمیسیون</span>
                  <button onClick={() => setDrill({ dimension: 'tier', id: r.tier, label: TIER_LABELS[r.tier] || r.tier })} className="text-xs text-primary-600 hover:underline">جزئیات</button>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">تفکیک بر اساس شهر</h3>
            <div className="space-y-2">
              {byCity.map((r) => (
                <div key={r.city} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <span className="text-sm font-medium text-gray-800">{r.city}</span>
                  <span className="text-xs text-gray-500">{r.venueCount} مجموعه</span>
                  <span className="text-xs text-gray-500">{Number(r.orders).toLocaleString('fa-IR')} سفارش</span>
                  <span className="text-sm font-medium text-gray-900 mr-auto">{Number(r.gmv).toLocaleString('fa-IR')} تومان</span>
                  <button onClick={() => setDrill({ dimension: 'city', id: r.city, label: r.city })} className="text-xs text-primary-600 hover:underline">جزئیات</button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Cohorts */}
      {activeTab === 'cohorts' && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">تحلیل کوهورت — نرخ بازگشت مشتریان</h3>
          <div className="overflow-auto">
            <table className="w-full text-sm text-right">
              <thead><tr className="text-xs text-gray-500 border-b">
                <th className="pb-2">ماه ورود</th><th className="pb-2">اندازه کوهورت</th><th className="pb-2">مشتریان تکراری</th><th className="pb-2">نرخ بازگشت</th>
              </tr></thead>
              <tbody>
                {cohorts.map((r) => (
                  <tr key={r.cohortMonth} className="border-b hover:bg-gray-50">
                    <td className="py-2 font-medium">{r.cohortMonth}</td>
                    <td className="py-2">{Number(r.cohortSize).toLocaleString('fa-IR')}</td>
                    <td className="py-2">{Number(r.repeatCustomers).toLocaleString('fa-IR')}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${Number(r.repeatRate) >= 50 ? 'bg-green-100 text-green-700' : Number(r.repeatRate) >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {r.repeatRate}٪
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cohorts.length === 0 && <p className="text-gray-400 text-sm text-center py-6">داده‌ای در این بازه زمانی موجود نیست.</p>}
        </Card>
      )}

      {/* Venues */}
      {activeTab === 'venues' && (
        <div className="space-y-3">
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3">عملکرد مجموعه‌ها</h3>
            <div className="overflow-auto">
              <table className="w-full text-sm text-right">
                <thead><tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2">مجموعه</th><th className="pb-2">شهر</th><th className="pb-2">اشتراک</th>
                  <th className="pb-2">سفارش‌ها</th><th className="pb-2">درآمد</th><th className="pb-2">وضعیت</th><th className="pb-2"></th>
                </tr></thead>
                <tbody>
                  {byVenue.map((r) => (
                    <tr key={r.venueId} className="border-b hover:bg-gray-50">
                      <td className="py-2 font-medium">{r.venueName}</td>
                      <td className="py-2 text-gray-500">{r.city}</td>
                      <td className="py-2"><span className={`px-1.5 py-0.5 rounded text-xs ${TIER_COLORS[r.subscriptionTier]}`}>{TIER_LABELS[r.subscriptionTier] || r.subscriptionTier}</span></td>
                      <td className="py-2">{Number(r.orders).toLocaleString('fa-IR')}</td>
                      <td className="py-2">{Number(r.gmv).toLocaleString('fa-IR')}</td>
                      <td className="py-2">
                        {venueActivity.find((v) => v.id === r.venueId)?.activityStatus === 'CHURNED'
                          ? <span className="text-xs text-red-600">ریزش</span>
                          : <span className="text-xs text-green-600">فعال</span>}
                      </td>
                      <td className="py-2">
                        <button onClick={() => setDrill({ dimension: 'venue', id: r.venueId, label: r.venueName })} className="text-xs text-primary-600 hover:underline">جزئیات</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'funnel' && funnel && (
        <div className="space-y-3">
          <Card>
            <h3 className="font-semibold text-gray-800 mb-1">قیف تبدیل سفارش</h3>
            <p className="text-xs text-gray-500 mb-4">
              مسیر سفارش از ثبت تا سرو شدن — نرخ افت هر مرحله نسبت به مرحله قبل محاسبه شده است.
            </p>
            <div className="space-y-2">
              {funnel.stages.map((s, i) => {
                const widthPct = funnel.stages[0].count > 0 ? (s.count / funnel.stages[0].count) * 100 : 0;
                return (
                  <div key={s.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{s.label}</span>
                      <span className="text-gray-500">
                        {s.count.toLocaleString('fa-IR')} ({s.conversionFromStart.toLocaleString('fa-IR')}٪)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full flex items-center justify-end px-2 transition-all"
                        style={{ width: `${Math.max(widthPct, 2)}%` }}
                      />
                    </div>
                    {i > 0 && s.dropOffRate > 0 && (
                      <p className="text-[11px] text-red-500 mt-0.5">
                        {s.dropOffRate.toLocaleString('fa-IR')}٪ افت نسبت به مرحله قبل
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {funnel.cancelled > 0 && (
              <p className="text-xs text-gray-500 mt-4 border-t pt-3">
                {funnel.cancelled.toLocaleString('fa-IR')} سفارش در این بازه لغو شده است.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
