import { useEffect, useState } from 'react';
import { CalendarClock, Phone, Users, Check, X, Ban } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const STATUS_META = {
  PENDING: { label: 'در انتظار تایید', className: 'bg-accent-100 text-accent-800 border-accent-200' },
  CONFIRMED: { label: 'تایید شده', className: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED: { label: 'لغو شده', className: 'bg-red-50 text-red-500 border-red-200' },
  COMPLETED: { label: 'انجام شده', className: 'bg-gray-100 text-ink/50 border-gray-200' },
  NO_SHOW: { label: 'عدم حضور', className: 'bg-gray-100 text-ink/50 border-gray-200' },
};

function formatTime(dt) {
  return new Date(dt).toLocaleString('fa-IR', { weekday: 'long', hour: '2-digit', minute: '2-digit', month: 'long', day: 'numeric' });
}

export default function Reservations() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState('UPCOMING');

  async function refresh() {
    const params = filter === 'UPCOMING' ? { from: new Date().toISOString() } : {};
    const { data } = await api.get(`/venues/${venueId}/reservations`, { params });
    setReservations(data);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, filter]);

  async function setStatus(reservation, status) {
    await api.patch(`/venues/${venueId}/reservations/${reservation.id}`, { status });
    refresh();
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { key: 'UPCOMING', label: 'پیش‌رو' },
          { key: 'ALL', label: 'همه' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              filter === f.key ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button' : 'bg-surface-2/60 text-ink/55 border border-black/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {reservations.length === 0 && (
        <p className="text-center text-ink/40 text-sm py-10">رزروی برای نمایش وجود ندارد.</p>
      )}

      <div className="space-y-2.5">
        {reservations.map((r) => {
          const meta = STATUS_META[r.status];
          return (
            <div key={r.id} className="card-luxe p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-11 h-11 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center shrink-0">
                  <CalendarClock size={18} />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-ink text-sm truncate">{r.guestName}</p>
                  <p className="text-xs text-ink/50 mt-0.5">{formatTime(r.reservationTime)}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-ink/45">
                    <span className="flex items-center gap-1">
                      <Users size={11} />
                      {Number(r.partySize).toLocaleString('fa-IR')} نفر
                    </span>
                    <span className="flex items-center gap-1" dir="ltr">
                      <Phone size={11} />
                      {r.guestPhone}
                    </span>
                    {r.tableNumber && <span>میز {r.tableNumber}</span>}
                  </div>
                  {r.notes && <p className="text-[11px] text-ink/40 mt-1">{r.notes}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${meta.className}`}>{meta.label}</span>
                {r.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setStatus(r, 'CONFIRMED')}
                      className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-colors"
                      aria-label="تایید"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setStatus(r, 'CANCELLED')}
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                      aria-label="لغو"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
                {r.status === 'CONFIRMED' && (
                  <button
                    onClick={() => setStatus(r, 'NO_SHOW')}
                    className="text-[11px] font-bold text-ink/45 hover:text-red-500 flex items-center gap-1"
                  >
                    <Ban size={12} />
                    عدم حضور
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
