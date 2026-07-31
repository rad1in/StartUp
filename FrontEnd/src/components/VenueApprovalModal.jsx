import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, XCircle, ShieldCheck, X } from 'lucide-react';
import api from '../services/api';

// Instead of a blind "approve" button, this pulls the venue's full profile
// and shows what's actually in place (logo, address, a real menu, working
// coordinates) before the admin commits — approve/reject stay one click, but
// now an informed one. Missing items don't block approval; they're a warning
// the admin can see and choose to override.
export default function VenueApprovalModal({ venueId, venueName, onApprove, onReject, onClose }) {
  const [venue, setVenue] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/admin/venues/${venueId}/full`).then(({ data }) => setVenue(data));
  }, [venueId]);

  const checks = venue
    ? [
        { label: 'لوگو ثبت شده', ok: Boolean(venue.logoUrl) },
        { label: 'آدرس کامل', ok: Boolean(venue.address && venue.address.length > 5) },
        { label: 'مختصات جغرافیایی معتبر', ok: Boolean(venue.lat && venue.lng) },
        { label: 'حداقل یک دسته‌بندی منو', ok: (venue.categories?.length || 0) > 0 },
        { label: 'حداقل یک آیتم منو', ok: (venue.menuItems?.length || 0) > 0 },
        { label: 'ساعات کاری تنظیم شده', ok: Boolean(venue.openingHours) },
      ]
    : [];
  const passedCount = checks.filter((c) => c.ok).length;
  const allPassed = checks.length > 0 && passedCount === checks.length;

  async function approve() {
    setBusy(true);
    try {
      await onApprove();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    setBusy(true);
    try {
      await onReject(rejectReason || undefined);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  // Rendered via a portal straight onto <body>, not inline in the admin page
  // tree — kept it independent of ancestor layout/stacking so this overlay
  // can't ever be affected by however Venues.jsx or AdminLayout evolve.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-strong rounded-3xl shadow-lift w-full max-w-md p-6 space-y-4 animate-pop-in" dir="rtl">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-ink text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-accent-600" />
            بررسی تاییدیه مجموعه
          </h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-ink/60">{venueName}</p>

        {!venue && <p className="text-sm text-ink/40 py-4">در حال بارگذاری...</p>}

        {venue && (
          <>
            <div className="space-y-1.5">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-red-400 shrink-0" />
                  )}
                  <span className={c.ok ? 'text-ink' : 'text-ink/50'}>{c.label}</span>
                </div>
              ))}
            </div>

            <p className={`text-xs font-bold ${allPassed ? 'text-green-700' : 'text-accent-800'}`}>
              {passedCount} از {checks.length} مورد کامل است
              {!allPassed && ' — می‌توانید با وجود موارد ناقص هم تایید کنید.'}
            </p>

            {showRejectInput && (
              <input
                autoFocus
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
                placeholder="دلیل رد (اختیاری)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={approve} disabled={busy} className="btn-gold flex-1 py-2.5 text-sm">
                تایید مجموعه
              </button>
              {showRejectInput ? (
                <button
                  onClick={reject}
                  disabled={busy}
                  className="px-4 py-2.5 rounded-full text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  ثبت رد
                </button>
              ) : (
                <button
                  onClick={() => setShowRejectInput(true)}
                  className="px-4 py-2.5 rounded-full text-sm font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                >
                  رد کردن
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
