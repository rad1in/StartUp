import { useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

// "Closed today" switch — an instant, reversible way to stop new orders
// without touching the weekly opening-hours schedule (e.g. ran out of stock,
// short-staffed). Blocks POST /orders on the backend the moment it's on.
export default function TemporaryClosureToggle({ venue, venueId, onChange }) {
  const [busy, setBusy] = useState(false);
  const closed = Boolean(venue?.isTemporarilyClosed);

  async function toggle() {
    setBusy(true);
    try {
      let reason = null;
      if (!closed) {
        reason = window.prompt('دلیل تعطیلی موقت (اختیاری):', '') || null;
      }
      const { data } = await api.patch(`/venues/${venueId}/temporary-closure`, {
        isTemporarilyClosed: !closed,
        reason,
      });
      onChange?.(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`card-luxe p-4 flex items-center justify-between gap-4 ${closed ? 'ring-2 ring-red-300' : ''}`}>
      <div className="flex items-center gap-3">
        <span
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            closed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
          }`}
        >
          {closed ? <Ban size={20} /> : <CheckCircle2 size={20} />}
        </span>
        <div>
          <p className="font-extrabold text-ink text-sm">{closed ? 'امروز تعطیل است' : 'مجموعه باز است'}</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {closed
              ? venue?.temporarilyClosedReason || 'مشتریان امکان ثبت سفارش جدید ندارند.'
              : 'مشتریان می‌توانند سفارش ثبت کنند.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
          closed
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white'
        }`}
      >
        {busy ? '...' : closed ? 'باز کردن مجموعه' : 'تعطیلی موقت امروز'}
      </button>
    </div>
  );
}
