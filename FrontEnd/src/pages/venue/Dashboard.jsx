import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenueSocket } from '../../hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';
import Forecasting from './Forecasting';
import OnboardingBanner from '../../components/OnboardingBanner';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.2);
  } catch (err) {
    // audio not supported/allowed — ignore
  }
}

function TrendChart({ data }) {
  const { t } = useLanguage();
  if (data.length === 0) return <p className="text-gray-500 text-sm">{t('common.noDataToShow')}</p>;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const width = 500;
  const height = 140;
  const barWidth = width / data.length - 6;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-36">
      {data.map((d, i) => {
        const barHeight = (Number(d.revenue) / max) * (height - 20);
        const x = i * (width / data.length) + 3;
        const y = height - barHeight - 15;
        return (
          <g key={d.day}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill="#26241F" rx={3} />
            <text x={x + barWidth / 2} y={height - 2} fontSize="8" textAnchor="middle" fill="#98948A">
              {new Date(d.day).getDate()}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function PeakHoursChart({ data }) {
  const { t } = useLanguage();
  const byHour = new Map(data.map((d) => [d.hour, d.orderCount]));
  const max = Math.max(...data.map((d) => d.orderCount), 1);
  return (
    <div className="flex items-end gap-1 h-24">
      {Array.from({ length: 24 }).map((_, hour) => {
        const count = byHour.get(hour) || 0;
        return (
          <div key={hour} className="flex-1 flex flex-col items-center justify-end h-full" title={`${hour}:00 — ${count} ${t('venue.dashboard.ordersSuffix')}`}>
            <div
              className="w-full bg-primary-500 rounded-t"
              style={{ height: `${(count / max) * 100}%`, minHeight: count > 0 ? '2px' : 0 }}
            />
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard() {
  const { t, n, timeShort } = useLanguage();
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [dashboard, setDashboard] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('venue_sound_alert') === 'true');

  useEffect(() => {
    if (!venueId) return;
    api.get(`/accounting/${venueId}/dashboard`).then(({ data }) => setDashboard(data));
    api.get(`/orders/venue/${venueId}`).then(({ data }) => setLiveOrders(data.slice(0, 8)));
  }, [venueId]);

  useVenueSocket(venueId, {
    'order:new': (order) => {
      setLiveOrders((prev) => [order, ...prev].slice(0, 8));
      if (soundEnabled) playBeep();
    },
    'order:updated': (order) =>
      setLiveOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))),
  });

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('venue_sound_alert', String(next));
  }

  if (!venueId) return <p className="text-gray-500">{t('common.noVenueLinked')}</p>;
  if (!dashboard) return <p className="text-gray-500">{t('venue.dashboard.loadingDashboard')}</p>;

  const { today, trend7, topItems, peakHours } = dashboard;

  return (
    <div className="space-y-6">
      <OnboardingBanner
        storageKey="venue_onboarding_dismissed"
        title={t('venue.dashboard.onboardingTitle')}
        steps={[
          t('venue.dashboard.onboardingStep1'),
          t('venue.dashboard.onboardingStep2'),
          t('venue.dashboard.onboardingStep3'),
          t('venue.dashboard.onboardingStep4'),
        ]}
      />
      <div className="grid sm:grid-cols-4 gap-3">
        <Card>
          <p className="text-xs text-gray-500">{t('venue.dashboard.todayOrders')}</p>
          <p className="text-xl font-bold text-gray-800">{today.orderCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('venue.dashboard.todayRevenue')}</p>
          <p className="text-xl font-bold text-gray-800">{n(today.totalRevenue)} {t('common.toman')}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('venue.dashboard.activeOrders')}</p>
          <p className="text-xl font-bold text-gray-800">{today.activeCount}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">{t('venue.dashboard.avgOrderValue')}</p>
          <p className="text-xl font-bold text-primary-700">
            {n(Math.round(today.averageOrderValue))} {t('common.toman')}
          </p>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('venue.dashboard.salesTrend7d')}</h3>
          <TrendChart data={trend7} />
        </Card>
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('venue.dashboard.peakHours')}</h3>
          <PeakHoursChart data={peakHours} />
        </Card>
      </div>

      <Forecasting venueId={venueId} compact />

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.dashboard.topItems')}</h3>
        {topItems.length === 0 && <p className="text-gray-500 text-sm">{t('common.noneYet')}</p>}
        <div className="space-y-2">
          {topItems.map((item) => (
            <div key={item.item} className="flex items-center justify-between text-sm">
              <span>{item.item}</span>
              <span className="text-gray-500">{item.quantity} {t('venue.dashboard.soldCount')} — {n(item.revenue)} {t('common.toman')}</span>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{t('venue.dashboard.liveOrderFeed')}</h3>
          <Button variant={soundEnabled ? 'primary' : 'secondary'} onClick={toggleSound}>
            {soundEnabled ? t('venue.dashboard.soundOn') : t('venue.dashboard.soundOff')}
          </Button>
        </div>
        <div className="space-y-2">
          {liveOrders.map((order) => (
            <Card key={order.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">{order.table ? `${t('common.table')} ${order.table.tableNumber}` : order.isPickup ? t('common.pickup') : t('common.onlineOrder')}</p>
                <p className="text-xs text-gray-500">{timeShort(order.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
