import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Clock, Store, CheckSquare, Square, HeartPulse, Star } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import VenueApprovalModal from '../../components/VenueApprovalModal';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/SkeletonBlock';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useDensity } from '../../context/DensityContext';

const tierLabels = { FREE: 'رایگان (۵٪)', PRO: 'حرفه‌ای (۲٪)', ULTRA: 'حرفه‌ای‌پلاس (۱٪)' };

const statusLabels = {
  PENDING:   { label: 'در انتظار تایید', Icon: Clock,  className: 'border border-dashed border-gray-400 text-ink/60' },
  ACTIVE:    { label: 'فعال',            Icon: Check,  className: 'bg-primary-800 text-white' },
  SUSPENDED: { label: 'معلق',            Icon: X,      className: 'border-2 border-primary-800 text-ink font-bold' },
  REJECTED:  { label: 'رد شده',          Icon: null,   className: 'bg-gray-200 text-ink/50 line-through' },
};

export default function Venues() {
  const confirm = useConfirm();
  const toast = useToast();
  const { dense } = useDensity();
  const [venues, setVenues] = useState([]);
  const [filters, setFilters] = useState({ status: '', subscriptionTier: '', city: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [approvalTarget, setApprovalTarget] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [health, setHealth] = useState({});

  async function refresh() {
    setLoading(true);
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    const { data } = await api.get('/admin/venues', { params });
    setVenues(data);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    api
      .get('/admin/venue-health')
      .then(({ data }) => setHealth(Object.fromEntries(data.map((h) => [h.venueId, h]))))
      .catch(() => {});
  }, []);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === venues.length ? new Set() : new Set(venues.map((v) => v.id))));
  }

  async function bulkSetStatus(action) {
    if (selected.size === 0) return;
    const label = action === 'suspend' ? 'تعلیق' : 'فعال‌سازی مجدد';
    if (!(await confirm(`${selected.size} مجموعه انتخاب‌شده ${label} شوند؟`, { danger: action === 'suspend' }))) return;
    await Promise.all([...selected].map((id) => api.patch(`/admin/venues/${id}/${action}`, {})));
    toast.success(`${selected.size} مجموعه ${label} شدند.`);
    refresh();
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeTier(venue, subscriptionTier) {
    await api.patch(`/admin/venues/${venue.id}/subscription`, { subscriptionTier });
    refresh();
  }

  async function setStatus(venue, action) {
    const reason = ['reject', 'suspend'].includes(action)
      ? window.prompt('دلیل (اختیاری):') || undefined
      : undefined;
    await api.patch(`/admin/venues/${venue.id}/${action}`, { reason });
    refresh();
  }

  async function toggleFeatured(venue) {
    await api.patch(`/admin/venues/${venue.id}/featured`, { isFeatured: !venue.isFeatured });
    refresh();
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="جستجوی نام مجموعه..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(statusLabels).map(([status, { label }]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.subscriptionTier}
            onChange={(e) => setFilters((f) => ({ ...f, subscriptionTier: e.target.value }))}
          >
            <option value="">همه پلن‌ها</option>
            {Object.entries(tierLabels).map(([tier, label]) => (
              <option key={tier} value={tier}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="شهر..."
            value={filters.city}
            onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
          />
        </div>
        <div className="mt-3">
          <Button onClick={refresh}>اعمال فیلتر</Button>
        </div>
      </Card>

      {!loading && venues.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <button type="button" onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink">
            {selected.size > 0 && selected.size === venues.length ? <CheckSquare size={14} /> : <Square size={14} />}
            {selected.size > 0 ? `${selected.size.toLocaleString('fa-IR')} انتخاب شده` : 'انتخاب همه'}
          </button>
          {selected.size > 0 && (
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => bulkSetStatus('reactivate')}>فعال‌سازی گروهی</Button>
              <Button variant="danger" onClick={() => bulkSetStatus('suspend')}>تعلیق گروهی</Button>
            </div>
          )}
        </div>
      )}

      {loading && <SkeletonRows rows={5} />}

      <div className={dense ? 'space-y-1.5' : 'space-y-3'}>
        {venues.map((venue) => (
          <Card key={venue.id} className={`flex items-center justify-between flex-wrap gap-3 ${dense ? '!p-2.5' : ''}`}>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => toggleSelect(venue.id)} className="text-ink/40 hover:text-accent-600 shrink-0">
                {selected.has(venue.id) ? <CheckSquare size={16} /> : <Square size={16} />}
              </button>
              <div>
              <div className="flex items-center gap-2">
                <Link to={`/admin/venues/${venue.id}`} className="font-medium text-gray-800 hover:underline">
                  {venue.name}
                </Link>
                {!!venue.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                    <Star size={11} fill="currentColor" /> ویژه
                  </span>
                )}
                {(() => { const s = statusLabels[venue.status]; const Icon = s?.Icon; return (
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${s?.className}`}>
                    {Icon && <Icon size={11} />}{s?.label || venue.status}
                  </span>
                ); })()}
                {health[venue.id] && (
                  <span
                    title={`امتیاز سلامت: ${health[venue.id].score}`}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      health[venue.id].risk === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : health[venue.id].risk === 'MEDIUM'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    <HeartPulse size={11} />
                    {health[venue.id].score}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                مالک: {venue.owner?.name} — {venue.city || 'بدون شهر'}
              </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={venue.subscriptionTier}
                onChange={(e) => changeTier(venue, e.target.value)}
              >
                {Object.entries(tierLabels).map(([tier, label]) => (
                  <option key={tier} value={tier}>
                    {label}
                  </option>
                ))}
              </select>

              <Button variant={venue.isFeatured ? 'primary' : 'ghost'} onClick={() => toggleFeatured(venue)}>
                <Star size={14} className="inline ml-1" fill={venue.isFeatured ? 'currentColor' : 'none'} />
                {venue.isFeatured ? 'حذف ویژه' : 'ویژه کردن'}
              </Button>

              {venue.status === 'PENDING' && (
                <Button variant="primary" onClick={() => setApprovalTarget(venue)}>
                  بررسی و تصمیم‌گیری
                </Button>
              )}
              {venue.status === 'ACTIVE' && (
                <Button variant="danger" onClick={() => setStatus(venue, 'suspend')}>
                  تعلیق
                </Button>
              )}
              {venue.status === 'SUSPENDED' && (
                <Button variant="primary" onClick={() => setStatus(venue, 'reactivate')}>
                  فعال‌سازی مجدد
                </Button>
              )}
              <Link to={`/admin/venues/${venue.id}`}>
                <Button variant="ghost">جزئیات</Button>
              </Link>
            </div>
          </Card>
        ))}
        {!loading && venues.length === 0 && (
          <EmptyState icon={Store} title="مجموعه‌ای یافت نشد" hint="فیلترها را تغییر دهید یا جستجوی دیگری امتحان کنید." />
        )}
      </div>

      {approvalTarget && (
        <VenueApprovalModal
          venueId={approvalTarget.id}
          venueName={approvalTarget.name}
          onApprove={async () => {
            await api.patch(`/admin/venues/${approvalTarget.id}/approve`, {});
            refresh();
          }}
          onReject={async (reason) => {
            await api.patch(`/admin/venues/${approvalTarget.id}/reject`, { reason });
            refresh();
          }}
          onClose={() => setApprovalTarget(null)}
        />
      )}
    </div>
  );
}
