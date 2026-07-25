import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CreditCard, Radio, RefreshCw, Clock } from 'lucide-react';
import api from '../../services/api';
import { useAdminSocket } from '../../hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';

function formatUptime(seconds, t) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days.toLocaleString('fa-IR')} ${t('admin.liveOps.days')} ${hours.toLocaleString('fa-IR')} ${t('admin.liveOps.hours')}`;
  if (hours > 0) return `${hours.toLocaleString('fa-IR')} ${t('admin.liveOps.hours')} ${mins.toLocaleString('fa-IR')} ${t('admin.liveOps.minutes')}`;
  return `${mins.toLocaleString('fa-IR')} ${t('admin.liveOps.minutes')}`;
}

function timeAgo(dateStr, t) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t('admin.liveOps.justNow');
  if (mins < 60) return `${mins} ${t('admin.liveOps.minutesAgo')}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${t('admin.liveOps.hoursAgo')}`;
  return `${Math.floor(hours / 24)} ${t('admin.liveOps.daysAgo')}`;
}

function StatTile({ icon: Icon, label, value, tone = 'default' }) {
  const toneCls = {
    default: 'text-white',
    warn: 'text-accent-300',
    danger: 'text-red-400',
  }[tone];
  return (
    <div className="card-noir p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-accent-300">
          <Icon size={17} />
        </span>
      </div>
      <p className={`text-2xl font-black ${toneCls}`}>{value}</p>
      <p className="text-xs text-white/45 mt-1">{label}</p>
    </div>
  );
}

// Realtime operations dashboard for platform admins — API error rate, failed
// payment rate, live socket connection count, and a live feed of platform
// events (new orders, venue signups) piped straight from the admin socket
// room, plus the most recent server error log entries for quick triage.
export default function LiveOps() {
  const { t } = useLanguage();
  const [health, setHealth] = useState(null);
  const [errors, setErrors] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [h, e] = await Promise.all([
        api.get('/admin/system-health'),
        api.get('/admin/recent-api-errors', { params: { limit: 20 } }),
      ]);
      setHealth(h.data);
      setErrors(e.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 20000);
    return () => clearInterval(t);
  }, []);

  useAdminSocket({
    'order:new': (order) =>
      setFeed((prev) => [{ text: `${t('admin.liveOps.newOrderIn')} ${order.venue?.name || t('admin.liveOps.aVenue')}`, at: new Date().toISOString() }, ...prev].slice(0, 20)),
    'venue:registered': (venue) =>
      setFeed((prev) => [{ text: `${t('admin.liveOps.newVenueRegistered')}: ${venue.name}`, at: new Date().toISOString() }, ...prev].slice(0, 20)),
    'reservation:new': (r) =>
      setFeed((prev) => [{ text: `${t('admin.liveOps.newTableReservation')}: ${r.guestName}`, at: new Date().toISOString() }, ...prev].slice(0, 20)),
  });

  const failedPct = health ? (health.failedPaymentRate * 100).toFixed(1) : '—';
  const failedTone = health && health.failedPaymentRate > 0.1 ? 'danger' : health && health.failedPaymentRate > 0.03 ? 'warn' : 'default';
  const errorTone = health && health.apiErrorsLast24h > 20 ? 'danger' : health && health.apiErrorsLast24h > 5 ? 'warn' : 'default';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-ink flex items-center gap-2">
          <Activity size={20} className="text-accent-600" />
          {t('admin.liveOps.title')}
        </h2>
        <button
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 hover:text-ink bg-surface-2/60 border border-ink/10 rounded-full px-3 py-1.5 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {t('common.refresh')}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={AlertTriangle} label={t('admin.liveOps.apiErrorsLast24h')} value={health ? health.apiErrorsLast24h.toLocaleString('fa-IR') : '—'} tone={errorTone} />
        <StatTile icon={CreditCard} label={t('admin.liveOps.failedPaymentRate24h')} value={`${failedPct}٪`} tone={failedTone} />
        <StatTile icon={Radio} label={t('admin.liveOps.liveConnections')} value={health ? health.connectedSockets.toLocaleString('fa-IR') : '—'} />
        <StatTile icon={Clock} label={t('admin.liveOps.serverUptime')} value={health ? formatUptime(health.uptimeSeconds, t) : '—'} />
      </div>

      {health?.errorsByHour && (
        <div className="card-luxe p-5">
          <h3 className="font-extrabold text-ink mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent-600" />
            {t('admin.liveOps.errorTrend24h')}
          </h3>
          <div className="flex items-end gap-1 h-24">
            {health.errorsByHour.map((h, i) => {
              const max = Math.max(...health.errorsByHour.map((x) => x.count), 1);
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className={`w-full rounded-t ${h.count > 0 ? 'bg-red-400' : 'bg-black/[0.06]'}`}
                    style={{ height: `${Math.max((h.count / max) * 100, 3)}%` }}
                    title={`${t('admin.liveOps.hourLabel')} ${h.hour}: ${h.count} ${t('admin.liveOps.errorsWord')}`}
                  />
                </div>
              );
            })}
          </div>
          <p className="text-xs text-ink/35 mt-2 text-left">{t('admin.liveOps.chartAxisHint')}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card-luxe p-5">
          <h3 className="font-extrabold text-ink mb-3 flex items-center gap-2">
            <Radio size={16} className="text-accent-600" />
            {t('admin.liveOps.liveEventFeed')}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feed.length === 0 && <p className="text-ink/40 text-sm text-center py-6">{t('admin.liveOps.noLiveEventsYet')}</p>}
            {feed.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-b border-black/5 pb-2 animate-slide-in-left">
                <span className="text-ink/75">{item.text}</span>
                <span className="text-xs text-ink/35">{timeAgo(item.at, t)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-luxe p-5">
          <h3 className="font-extrabold text-ink mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            {t('admin.liveOps.recentServerErrors')}
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {errors.length === 0 && <p className="text-ink/40 text-sm text-center py-6">{t('admin.liveOps.noErrorsLogged')}</p>}
            {errors.map((err) => (
              <div key={err.id} className="text-xs border-b border-black/5 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-red-600">
                    {err.statusCode} · {err.method} {err.path}
                  </span>
                  <span className="text-ink/35">{timeAgo(err.createdAt, t)}</span>
                </div>
                {err.message && <p className="text-ink/50 mt-1 truncate">{err.message}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
