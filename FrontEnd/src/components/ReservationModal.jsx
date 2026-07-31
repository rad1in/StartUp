import { useState } from 'react';
import { X, CalendarClock, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Simple booking-request form — independent of the ordering flow. Guests can
// submit without an account; the venue confirms or declines from their
// Reservations panel.
export default function ReservationModal({ venueId, onClose }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    guestName: user?.name || '',
    guestPhone: user?.phone || '',
    partySize: 2,
    date: '',
    time: '19:00',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [venueFull, setVenueFull] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setVenueFull(false);
    if (!form.date) {
      setError('تاریخ رزرو را انتخاب کنید.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/venues/${venueId}/reservations`, {
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        partySize: Number(form.partySize),
        reservationTime: `${form.date}T${form.time}:00`,
        notes: form.notes || undefined,
      });
      setDone(true);
    } catch (err) {
      if (err.response?.data?.code === 'VENUE_FULL') {
        setVenueFull(true);
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || 'ثبت رزرو با خطا مواجه شد.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function joinWaitlist() {
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/venues/${venueId}/reservations/waitlist`, {
        guestName: form.guestName,
        guestPhone: form.guestPhone,
        partySize: Number(form.partySize),
        requestedTime: `${form.date}T${form.time}:00`,
        notes: form.notes || undefined,
      });
      setWaitlisted(true);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت در لیست انتظار با خطا مواجه شد.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="glass-strong rounded-3xl shadow-lift w-full max-w-sm p-6 animate-pop-in" dir="rtl">
        {waitlisted ? (
          <div className="text-center py-4">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-black text-ink text-lg">به لیست انتظار اضافه شدید</h3>
            <p className="text-sm text-ink/50 mt-2">به محض آزاد شدن یک میز در این بازه زمانی، به شما اطلاع داده می‌شود.</p>
            <button onClick={onClose} className="btn-gold w-full py-3 mt-5">
              متوجه شدم
            </button>
          </div>
        ) : done ? (
          <div className="text-center py-4">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-black text-ink text-lg">درخواست رزرو ثبت شد</h3>
            <p className="text-sm text-ink/50 mt-2">مجموعه به‌زودی رزرو شما را بررسی و تایید می‌کند.</p>
            <button onClick={onClose} className="btn-gold w-full py-3 mt-5">
              متوجه شدم
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-ink text-lg flex items-center gap-2">
                <CalendarClock size={20} className="text-accent-600" />
                رزرو میز
              </h3>
              <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            <input
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
              placeholder="نام شما"
              value={form.guestName}
              onChange={(e) => setForm({ ...form, guestName: e.target.value })}
              required
            />
            <input
              type="tel"
              dir="ltr"
              inputMode="numeric"
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
              placeholder="09123456789"
              value={form.guestPhone}
              onChange={(e) => setForm({ ...form, guestPhone: e.target.value.replace(/\D/g, '') })}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                className="glass-input rounded-xl px-3 py-2.5 text-sm"
                value={form.date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
              <input
                type="time"
                className="glass-input rounded-xl px-3 py-2.5 text-sm"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink/50 mb-1">تعداد نفرات</label>
              <input
                type="number"
                min={1}
                max={30}
                className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
                value={form.partySize}
                onChange={(e) => setForm({ ...form, partySize: e.target.value })}
              />
            </div>
            <textarea
              className="glass-input w-full rounded-xl px-4 py-2.5 text-sm resize-none"
              rows={2}
              placeholder="توضیحات (اختیاری)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

            {venueFull ? (
              <button type="button" onClick={joinWaitlist} disabled={submitting} className="btn-gold w-full py-3">
                {submitting ? 'در حال ثبت…' : 'قرار گرفتن در لیست انتظار'}
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="btn-gold w-full py-3">
                {submitting ? 'در حال ثبت…' : 'ثبت درخواست رزرو'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
