import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAdminSocket } from '../../hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import { Settings2, Eye, EyeOff, ArrowUp, ArrowDown, X } from 'lucide-react';

const DEFAULT_WIDGET_ORDER = ['kpis', 'gmv', 'growth', 'liveFeed', 'recentOrders', 'recentVenues'];
const STORAGE_KEY = 'admin.dashboard.widgets';

function loadWidgetPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !Array.isArray(saved.order)) throw new Error('invalid');
    const order = DEFAULT_WIDGET_ORDER.filter((k) => saved.order.includes(k));
    saved.order.forEach((k) => {
      if (DEFAULT_WIDGET_ORDER.includes(k) && !order.includes(k)) order.push(k);
    });
    return { order: order.length ? order : DEFAULT_WIDGET_ORDER, hidden: saved.hidden || [] };
  } catch {
    return { order: DEFAULT_WIDGET_ORDER, hidden: [] };
  }
}

function GrowthChart({ series, color, label }) {
  const { t } = useLanguage();
  if (series.length === 0) return <p className="text-gray-500 text-sm">{t('common.noDataToShow')}</p>;
  const max = Math.max(...series.map((d) => d.count), 1);
  const width = 500;
  const height = 120;
  const barWidth = width / series.length - 4;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-28">
        {series.map((d, i) => {
          const barHeight = (d.count / max) * (height - 16);
          const x = i * (width / series.length) + 2;
          const y = height - barHeight - 12;
          return (
            <g key={d.day}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();

  const WIDGET_LABELS = {
    kpis: t('admin.dashboard.widgetKpis'),
    gmv: t('admin.dashboard.widgetGmv'),
    growth: t('admin.dashboard.widgetGrowth'),
    liveFeed: t('admin.dashboard.widgetLiveFeed'),
    recentOrders: t('admin.dashboard.widgetRecentOrders'),
    recentVenues: t('admin.dashboard.widgetRecentVenues'),
  };

  function timeAgo(dateStr) {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return t('admin.dashboard.justNow');
    if (mins < 60) return `${mins} ${t('admin.dashboard.minutesAgo')}`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ${t('admin.dashboard.hoursAgo')}`;
    return `${Math.floor(hours / 24)} ${t('admin.dashboard.daysAgo')}`;
  }

  const [data, setData] = useState(null);
  const [liveFeed, setLiveFeed] = useState([]);
  const [widgetPrefs, setWidgetPrefs] = useState(loadWidgetPrefs);
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetPrefs));
  }, [widgetPrefs]);

  function toggleWidget(key) {
    setWidgetPrefs((prev) => ({
      ...prev,
      hidden: prev.hidden.includes(key) ? prev.hidden.filter((k) => k !== key) : [...prev.hidden, key],
    }));
  }

  function moveWidget(key, dir) {
    setWidgetPrefs((prev) => {
      const order = [...prev.order];
      const idx = order.indexOf(key);
      const swapWith = idx + dir;
      if (swapWith < 0 || swapWith >= order.length) return prev;
      [order[idx], order[swapWith]] = [order[swapWith], order[idx]];
      return { ...prev, order };
    });
  }

  function resetWidgets() {
    setWidgetPrefs({ order: DEFAULT_WIDGET_ORDER, hidden: [] });
  }

  const isVisible = (key) => !widgetPrefs.hidden.includes(key);

  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setData(data));
  }, []);

  useAdminSocket({
    'order:new': (order) =>
      setLiveFeed((prev) => [{ type: 'order', text: `${t('admin.dashboard.newOrderPrefix')} ${order.venue?.name || t('admin.dashboard.aVenue')}`, at: new Date().toISOString() }, ...prev].slice(0, 15)),
    'venue:registered': (venue) =>
      setLiveFeed((prev) => [{ type: 'venue', text: `${t('admin.dashboard.newVenueRegisteredPrefix')}: ${venue.name}`, at: new Date().toISOString() }, ...prev].slice(0, 15)),
    'venue:statusChanged': (venue) =>
      setLiveFeed((prev) => [{ type: 'venue', text: `${t('admin.dashboard.venueStatusChangedPrefix')} ${venue.name} ${t('admin.dashboard.venueStatusChangedMiddle')} ${venue.status}`, at: new Date().toISOString() }, ...prev].slice(0, 15)),
    'subscription:changed': (venue) =>
      setLiveFeed((prev) => [{ type: 'venue', text: `${t('admin.dashboard.subscriptionChangedPrefix')} ${venue.name}`, at: new Date().toISOString() }, ...prev].slice(0, 15)),
  });

  if (!data) return <p className="text-gray-500">{t('admin.dashboard.loadingDashboard')}</p>;

  const { kpis, growth, feed } = data;

  const widgetNodes = {
    kpis: (
      <div className="grid sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-gray-500">{t('admin.dashboard.kpiActiveVenues')}</p>
          <p className="text-xl font-bold text-gray-800">{kpis.venueCount.toLocaleString('fa-IR')}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('admin.dashboard.kpiCustomerCount')}</p>
          <p className="text-xl font-bold text-gray-800">{kpis.customerCount.toLocaleString('fa-IR')}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('admin.dashboard.kpiOrdersTodayWeekMonth')}</p>
          <p className="text-xl font-bold text-gray-800">
            {kpis.ordersToday.toLocaleString('fa-IR')} / {kpis.ordersWeek.toLocaleString('fa-IR')} /{' '}
            {kpis.ordersMonth.toLocaleString('fa-IR')}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('admin.dashboard.kpiTotalCommission')}</p>
          <p className="text-xl font-bold text-primary-700">{kpis.totalCommission.toLocaleString('fa-IR')} {t('common.toman')}</p>
        </Card>
      </div>
    ),
    gmv: (
      <Card>
        <p className="text-xs text-gray-500 mb-2">{t('admin.dashboard.widgetGmv')}</p>
        <p className="text-2xl font-bold text-gray-800">{kpis.gmv.toLocaleString('fa-IR')} {t('common.toman')}</p>
      </Card>
    ),
    growth: (
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.widgetGrowth')}</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <GrowthChart series={growth.venueSignups} color="#1D1B16" label={t('admin.dashboard.venueSignups')} />
          <GrowthChart series={growth.customerSignups} color="#6C6960" label={t('admin.dashboard.customerSignups')} />
          <GrowthChart series={growth.orderVolume} color="#A9A496" label={t('admin.dashboard.orderVolume')} />
        </div>
      </Card>
    ),
    liveFeed: (
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.widgetLiveFeed')}</h3>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {liveFeed.length === 0 && <p className="text-gray-500 text-sm">{t('admin.dashboard.noLiveEvents')}</p>}
          {liveFeed.map((item, i) => (
            <div key={i} className="text-sm flex items-center justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-700">{item.text}</span>
              <span className="text-xs text-gray-400">{timeAgo(item.at)}</span>
            </div>
          ))}
        </div>
      </Card>
    ),
    recentOrders: (
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.widgetRecentOrders')}</h3>
        <div className="space-y-2">
          {feed.recentOrders.slice(0, 8).map((order) => (
            <div key={order.id} className="text-sm flex items-center justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-700">{order.venueName}</span>
              <span className="text-gray-500">{Number(order.totalAmount).toLocaleString('fa-IR')} {t('common.toman')}</span>
            </div>
          ))}
        </div>
      </Card>
    ),
    recentVenues: (
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.dashboard.widgetRecentVenues')}</h3>
        <div className="space-y-2">
          {feed.recentVenues.slice(0, 8).map((venue) => (
            <div key={venue.id} className="text-sm flex items-center justify-between border-b border-gray-100 pb-1">
              <span className="text-gray-700">{venue.name}</span>
              <span className="text-gray-500">{venue.status}</span>
            </div>
          ))}
        </div>
      </Card>
    ),
  };

  const visibleOrder = widgetPrefs.order.filter((k) => isVisible(k));
  const skip = new Set();

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCustomizing(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-ink/60 border border-ink/10 rounded-lg px-3 py-1.5 hover:bg-ink/5"
        >
          <Settings2 size={14} />
          {t('admin.dashboard.customizeDashboard')}
        </button>
      </div>

      {visibleOrder.map((key) => {
        if (skip.has(key)) return null;
        if (key === 'liveFeed' && isVisible('recentOrders') && widgetPrefs.order.indexOf('recentOrders') > widgetPrefs.order.indexOf('liveFeed')) {
          skip.add('recentOrders');
          return (
            <div key={key} className="grid sm:grid-cols-2 gap-4">
              {widgetNodes.liveFeed}
              {widgetNodes.recentOrders}
            </div>
          );
        }
        return <div key={key}>{widgetNodes[key]}</div>;
      })}

      {visibleOrder.length === 0 && <p className="text-gray-500 text-sm">{t('admin.dashboard.allWidgetsHidden')}</p>}

      {customizing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCustomizing(false)}>
          <div className="glass-strong rounded-2xl shadow-lift w-full max-w-sm p-4 animate-pop-in" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-ink">{t('admin.dashboard.customizeDashboard')}</h3>
              <button type="button" onClick={() => setCustomizing(false)} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1.5">
              {widgetPrefs.order.map((key, i) => (
                <div key={key} className="flex items-center justify-between gap-2 border border-ink/10 rounded-lg px-2.5 py-1.5">
                  <span className={`text-sm ${isVisible(key) ? 'text-ink' : 'text-ink/30'}`}>{WIDGET_LABELS[key]}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveWidget(key, -1)} disabled={i === 0} className="p-1 text-ink/40 hover:text-ink disabled:opacity-30">
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveWidget(key, 1)}
                      disabled={i === widgetPrefs.order.length - 1}
                      className="p-1 text-ink/40 hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button type="button" onClick={() => toggleWidget(key)} className="p-1 text-ink/40 hover:text-ink">
                      {isVisible(key) ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={resetWidgets} className="mt-3 text-xs text-primary-700 hover:underline">
              {t('admin.dashboard.resetToDefault')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
