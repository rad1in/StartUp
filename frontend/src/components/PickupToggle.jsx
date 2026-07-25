import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import api from '../services/api';

// Lets a venue accept "pickup" orders — a customer who isn't at a table can
// still order ahead and collect it in person. One switch, no table required.
export default function PickupToggle({ venue, venueId, onChange }) {
  const [busy, setBusy] = useState(false);
  const enabled = Boolean(venue?.acceptsPickup);

  async function toggle() {
    setBusy(true);
    try {
      const { data } = await api.patch(`/venues/${venueId}`, { acceptsPickup: !enabled });
      onChange?.(data);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-luxe p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
            enabled ? 'bg-accent-100 text-accent-700' : 'bg-black/[0.04] text-ink/30'
          }`}
        >
          <ShoppingBag size={20} />
        </span>
        <div>
          <p className="font-extrabold text-ink text-sm">سفارش پیک‌آپ (بیرون‌بر)</p>
          <p className="text-xs text-ink/50 mt-0.5">
            {enabled ? 'مشتریان می‌توانند بدون میز، سفارش را از پیش ثبت و حضوری تحویل بگیرند.' : 'در حال حاضر غیرفعال است.'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
          enabled
            ? 'bg-accent-500 text-white hover:bg-accent-600'
            : 'bg-surface-2/60 text-ink/60 border border-black/10 hover:border-accent-300'
        }`}
      >
        {busy ? '...' : enabled ? 'فعال است' : 'فعال‌سازی'}
      </button>
    </div>
  );
}
