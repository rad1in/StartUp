import { useEffect, useRef, useState } from 'react';
import { ChefHat, Clock, Volume2, VolumeX, RefreshCw, X, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenueSocket } from '../../hooks/useSocket';
import { useLanguage } from '../../context/LanguageContext';

// Kitchen Display System — a full-screen, dark, touch-friendly board for the
// kitchen line. Live tickets flow across three lanes (new → preparing → ready),
// each colored by how long it has been waiting, with an audible chime on new
// orders. Designed to run on a wall-mounted tablet, independent of the admin UI.

function getLanes(t) {
  return [
    { key: 'PENDING', label: t('venue.kitchenDisplay.laneNew'), accent: 'border-r-4 border-accent-400' },
    { key: 'PREPARING', label: t('venue.kitchenDisplay.lanePreparing'), accent: 'border-r-4 border-accent-200' },
    { key: 'READY', label: t('venue.kitchenDisplay.laneReady'), accent: 'border-r-4 border-green-400' },
  ];
}
const NEXT = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' };
function getNextLabel(t) {
  return { PENDING: t('venue.kitchenDisplay.actionStartCooking'), PREPARING: t('venue.kitchenDisplay.actionMarkReady'), READY: t('venue.kitchenDisplay.actionMarkServed') };
}

function minutesSince(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
}

// Age-based urgency color: fresh → amber → red as tickets get older.
function urgency(mins, t) {
  if (mins >= 15) return { ring: 'ring-2 ring-red-500', chip: 'bg-red-500 text-white', label: t('venue.kitchenDisplay.urgencyLate') };
  if (mins >= 8) return { ring: 'ring-1 ring-accent-400/70', chip: 'bg-accent-400 text-black', label: t('venue.kitchenDisplay.urgencyWaiting') };
  return { ring: 'ring-1 ring-white/10', chip: 'bg-white/15 text-white', label: t('venue.kitchenDisplay.urgencyFresh') };
}

export default function KitchenDisplay() {
  const { t, n } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const venueId = user?.venueId;
  const [orders, setOrders] = useState([]);
  const [soundOn, setSoundOn] = useState(true);
  const [, forceTick] = useState(0);
  const audioCtxRef = useRef(null);
  const LANES = getLanes(t);
  const NEXT_LABEL = getNextLabel(t);

  async function refresh() {
    if (!venueId) return;
    const { data } = await api.get(`/orders/venue/${venueId}`);
    setOrders(data.filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  // Re-render every 20s so the elapsed timers and urgency colors stay live.
  useEffect(() => {
    const timer = setInterval(() => forceTick((n) => n + 1), 20000);
    return () => clearInterval(timer);
  }, []);

  // Short synthesized chime — no asset needed, works offline.
  function chime() {
    if (!soundOn) return;
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1180, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      /* audio not available — ignore */
    }
  }

  useVenueSocket(venueId, {
    'order:new': (order) => {
      setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev : [order, ...prev]));
      chime();
    },
    'order:updated': (order) =>
      setOrders((prev) => {
        const keep = ['PENDING', 'PREPARING', 'READY'].includes(order.status);
        const exists = prev.some((o) => o.id === order.id);
        if (!keep) return prev.filter((o) => o.id !== order.id);
        if (exists) return prev.map((o) => (o.id === order.id ? { ...o, ...order } : o));
        return [order, ...prev];
      }),
  });

  async function advance(order) {
    const next = NEXT[order.status];
    if (!next) return;
    // Optimistic: drop/move immediately so the line feels instant.
    setOrders((prev) =>
      next === 'SERVED' ? prev.filter((o) => o.id !== order.id) : prev.map((o) => (o.id === order.id ? { ...o, status: next } : o))
    );
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
    } catch {
      refresh();
    }
  }

  if (!venueId) {
    return <p className="text-white/70 p-8">{t('common.noVenueLinked')}</p>;
  }

  const counts = LANES.map((l) => orders.filter((o) => o.status === l.key).length);

  return (
    <div className="fixed inset-0 z-40 flex flex-col text-white"
      style={{ background: 'radial-gradient(120% 80% at 85% -10%, rgba(201,146,47,0.14), transparent 55%), linear-gradient(170deg, #26241f, #0f0e0c)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white/10 border border-accent-300/30 flex items-center justify-center text-accent-300">
            <ChefHat size={24} />
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-none">{t('venue.kitchenDisplay.title')}</h1>
            <p className="text-xs text-white/45 mt-1">{n(orders.length)} {t('venue.kitchenDisplay.activeOrders')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundOn((s) => !s)}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title={soundOn ? t('venue.kitchenDisplay.muteSound') : t('venue.kitchenDisplay.unmuteSound')}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} className="text-white/50" />}
          </button>
          <button
            onClick={refresh}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={17} />
          </button>
          <button
            onClick={() => navigate('/venue/orders')}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center transition-colors"
            title={t('venue.kitchenDisplay.exitDisplay')}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Lanes */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-4 overflow-hidden">
        {LANES.map((lane, li) => (
          <div key={lane.key} className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 px-1 shrink-0">
              <h2 className="font-extrabold text-sm">{lane.label}</h2>
              <span className="text-xs font-bold bg-white/10 rounded-full px-2.5 py-0.5">
                {n(counts[li])}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pl-1 no-scrollbar">
              {orders
                .filter((o) => o.status === lane.key)
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
                .map((order) => {
                  const mins = minutesSince(order.createdAt);
                  const u = urgency(mins, t);
                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl bg-white/[0.06] backdrop-blur p-3.5 ${u.ring} ${lane.accent} transition-all`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-extrabold text-base">
                          {order.table ? `${t('common.table')} ${order.table.tableNumber}` : order.isPickup ? t('common.pickup') : t('common.online')}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 ${u.chip}`}>
                          <Clock size={11} />
                          {n(mins)}′
                        </span>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center justify-between text-sm">
                            <span className="text-white/85">{item.menuItem?.name || item.combo?.name}</span>
                            <span className="font-bold text-accent-300">×{n(item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        <button
                          onClick={() => advance(order)}
                          className="flex-1 py-2 rounded-xl bg-accent-400 hover:bg-accent-300 text-black font-extrabold text-sm transition-colors active:scale-95"
                        >
                          {NEXT_LABEL[order.status]}
                        </button>
                        <button
                          onClick={() => window.open(`/venue/orders/${order.id}/receipt-print`, '_blank', 'width=380,height=600')}
                          className="w-10 shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-95"
                          title={t('venue.kitchenDisplay.printReceipt')}
                        >
                          <Printer size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              {counts[li] === 0 && (
                <p className="text-center text-white/25 text-sm pt-10">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
