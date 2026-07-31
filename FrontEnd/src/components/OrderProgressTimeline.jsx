import { useEffect, useState } from 'react';
import { Check, Clock, Receipt, ChefHat, Bell, Handshake, Ban } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function getSteps(t) {
  return [
    { key: 'PENDING', label: t('components.orderProgressTimeline.stepPending'), icon: Receipt },
    { key: 'PREPARING', label: t('components.orderProgressTimeline.stepPreparing'), icon: ChefHat },
    { key: 'READY', label: t('components.orderProgressTimeline.stepReady'), icon: Bell },
    { key: 'SERVED', label: t('components.orderProgressTimeline.stepServed'), icon: Handshake },
  ];
}

function minutesSince(dateStr) {
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
}

// Visual step tracker for a single order — fills in as the order advances
// through the kitchen lifecycle, driven by the same `order:updated` socket
// event the page already listens to. Shows elapsed time as a live-ticking
// estimate since there's no per-status timestamp history to draw on.
export default function OrderProgressTimeline({ order }) {
  const { t, n } = useLanguage();
  const STEPS = getSteps(t);
  const [, forceTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  if (order.status === 'CANCELLED') {
    return (
      <div className="card-luxe p-4 flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0">
          <Ban size={18} />
        </span>
        <div>
          <p className="font-bold text-ink text-sm">{t('components.orderProgressTimeline.cancelledTitle')}</p>
          {order.voidReason && <p className="text-xs text-ink/50 mt-0.5">{order.voidReason}</p>}
        </div>
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.key === order.status);
  const elapsed = minutesSince(order.createdAt);

  return (
    <div className="card-luxe p-5 mb-4">
      <div className="flex items-center justify-between mb-5">
        <p className="font-extrabold text-ink text-sm">{t('components.orderProgressTimeline.statusTitle')}</p>
        <span className="inline-flex items-center gap-1 text-xs text-ink/45">
          <Clock size={12} />
          {n(elapsed)} {t('components.orderProgressTimeline.minutesAgoSuffix')}
        </span>
      </div>

      <div className="flex items-center">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = activeIndex > i;
          const active = activeIndex === i;
          const reached = activeIndex >= i;
          return (
            <div key={step.key} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <span
                  className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${
                    activeIndex >= i ? 'bg-gradient-to-l from-accent-500 to-accent-300' : 'bg-black/10'
                  }`}
                />
              )}
              <span
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  done
                    ? 'bg-accent-500 text-white'
                    : active
                    ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button animate-pulse-soft'
                    : 'bg-black/[0.05] text-ink/25'
                }`}
              >
                {done ? <Check size={15} /> : <Icon size={14} />}
              </span>
              <span className={`text-[11px] font-bold mt-2 text-center ${reached ? 'text-ink' : 'text-ink/35'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {order.status !== 'SERVED' && (
        <p className="text-center text-[11px] text-ink/40 mt-4">
          {order.prepEstimate
            ? `${t('components.orderProgressTimeline.prepEstimatePrefix')} ${n(order.prepEstimate.estimatedMinutes)} ${t('components.orderProgressTimeline.prepEstimateSuffix')}${
                order.prepEstimate.basedOnHistory ? '' : t('components.orderProgressTimeline.initialEstimateSuffix')
              }`
            : `${t('components.orderProgressTimeline.defaultEstimatePrefix')} ${n(10)} ${t('components.orderProgressTimeline.defaultEstimateMid')} ${n(15)} ${t('components.orderProgressTimeline.defaultEstimateSuffix')}`}
        </p>
      )}
    </div>
  );
}
