import { Check, X, Clock, Loader2, CircleDot, RotateCcw } from 'lucide-react';

// Status badges: soft tinted pills — the muted hue plus a leading icon make
// states scannable at a glance without shouting over the cream theme.
const statusLabels = {
  PENDING:   { label: 'در انتظار',          Icon: Clock,     className: 'border border-dashed border-gray-400 text-ink/60 bg-transparent' },
  PREPARING: { label: 'در حال آماده‌سازی', Icon: Loader2,   className: 'bg-accent-50 border border-accent-200 text-accent-800' },
  READY:     { label: 'آماده سرو',          Icon: CircleDot, className: 'bg-green-50 border border-green-200 text-green-700 font-bold' },
  SERVED:    { label: 'سرو شده',            Icon: Check,     className: 'bg-primary-800 text-white' },
  CANCELLED: { label: 'لغو شده',            Icon: X,         className: 'bg-red-50 border border-red-200 text-red-600 line-through' },
};

const paymentLabels = {
  PENDING:  { label: 'در انتظار پرداخت', Icon: Clock,      className: 'border border-dashed border-gray-400 text-ink/60 bg-transparent' },
  SUCCESS:  { label: 'پرداخت موفق',      Icon: Check,      className: 'bg-green-50 border border-green-200 text-green-700 font-bold' },
  FAILED:   { label: 'پرداخت ناموفق',    Icon: X,          className: 'bg-red-50 border border-red-200 text-red-600 font-bold' },
  REFUNDED: { label: 'مسترد شده',        Icon: RotateCcw,  className: 'bg-gray-200 text-ink/50' },
};

function Badge({ config }) {
  if (!config) return null;
  const { Icon, label, className } = config;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${className}`}>
      <Icon size={11} />
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }) {
  return <Badge config={statusLabels[status]} />;
}

export function PaymentStatusBadge({ status }) {
  return <Badge config={paymentLabels[status]} />;
}
