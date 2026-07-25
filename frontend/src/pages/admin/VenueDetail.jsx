import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, UserCog, Check, X, Clock } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Breadcrumb from '../../components/Breadcrumb';
import { SkeletonRows } from '../../components/SkeletonBlock';

function ApprovalStages({ venueId, onVenueChanged }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [stages, setStages] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});
  const [busyKey, setBusyKey] = useState(null);

  async function refresh() {
    const { data } = await api.get(`/admin/venues/${venueId}/approval-stages`);
    setStages(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function act(stageKey, status) {
    if (status === 'REJECTED' && !(await confirm('این مرحله رد شود؟ وضعیت مجموعه به «رد شده» تغییر می‌کند.', { danger: true }))) return;
    setBusyKey(stageKey);
    try {
      await api.patch(`/admin/venues/${venueId}/approval-stages/${stageKey}`, {
        status,
        note: noteDrafts[stageKey] || '',
      });
      await refresh();
      onVenueChanged?.();
      toast.success(status === 'COMPLETED' ? 'مرحله تایید شد.' : 'مرحله رد شد.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'به‌روزرسانی مرحله ناموفق بود.');
    } finally {
      setBusyKey(null);
    }
  }

  if (!stages) return null;

  return (
    <Card>
      <h3 className="font-semibold text-gray-800 mb-3">جریان تایید ثبت‌نام</h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const isBlocked = stage.status === 'PENDING' && i > 0 && stages[i - 1].status !== 'COMPLETED';
          return (
            <div key={stage.stageKey} className="flex items-start gap-3 border border-gray-100 rounded-xl p-3">
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  stage.status === 'COMPLETED'
                    ? 'bg-green-100 text-green-700'
                    : stage.status === 'REJECTED'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {stage.status === 'COMPLETED' ? <Check size={14} /> : stage.status === 'REJECTED' ? <X size={14} /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{stage.label}</p>
                {stage.note && <p className="text-xs text-gray-500 mt-0.5">یادداشت: {stage.note}</p>}
                {stage.status === 'PENDING' && !isBlocked && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                      placeholder="یادداشت (اختیاری)"
                      value={noteDrafts[stage.stageKey] || ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [stage.stageKey]: e.target.value }))}
                    />
                    <button
                      type="button"
                      disabled={busyKey === stage.stageKey}
                      onClick={() => act(stage.stageKey, 'COMPLETED')}
                      className="text-xs font-bold text-green-700 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50"
                    >
                      تایید
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === stage.stageKey}
                      onClick={() => act(stage.stageKey, 'REJECTED')}
                      className="text-xs font-bold text-red-700 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                    >
                      رد
                    </button>
                  </div>
                )}
                {isBlocked && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    در انتظار تکمیل مرحله قبلی
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function VenueDetail() {
  const { venueId } = useParams();
  const navigate = useNavigate();
  const { user, impersonate } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();
  const [venue, setVenue] = useState(null);
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [impersonating, setImpersonating] = useState(false);

  function refreshVenue() {
    api.get(`/admin/venues/${venueId}/full`).then(({ data }) => setVenue(data));
  }

  useEffect(() => {
    refreshVenue();
    api.get(`/admin/venues/${venueId}/orders`).then(({ data }) => setOrders(data.slice(0, 15)));
    api.get(`/admin/venues/${venueId}/accounting-summary`, { params: { period: 'monthly' } }).then(({ data }) => setSummary(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function handleImpersonate() {
    if (!(await confirm(`وارد پنل مالک «${venue.name}» شوید؟ این اقدام در گزارش رویدادها ثبت می‌شود.`))) return;
    setImpersonating(true);
    try {
      await impersonate(venueId);
      navigate('/venue');
    } catch (err) {
      toast.error(err.response?.data?.message || 'جانشینی با خطا مواجه شد.');
    } finally {
      setImpersonating(false);
    }
  }

  if (!venue) {
    return (
      <div>
        <Breadcrumb items={[{ label: 'مجموعه‌ها', to: '/admin/venues' }, { label: 'در حال بارگذاری...' }]} />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: 'مجموعه‌ها', to: '/admin/venues' }, { label: venue.name }]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/admin/venues" className="text-primary-700 text-sm hover:underline">
          <span className="flex items-center gap-1"><ArrowRight size={14} />بازگشت به فهرست مجموعه‌ها</span>
        </Link>
        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-surface-2/60 text-primary-800 border border-primary-200 hover:bg-primary-800 hover:text-white transition-all active:scale-95"
          >
            <UserCog size={14} />
            {impersonating ? 'در حال ورود…' : 'ورود به پنل مالک (پشتیبانی)'}
          </button>
        )}
      </div>

      <Card>
        <h2 className="text-lg font-bold text-gray-800">{venue.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{venue.description}</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
          <p><span className="text-gray-500">آدرس:</span> {venue.address}</p>
          <p><span className="text-gray-500">شهر:</span> {venue.city || '—'}</p>
          <p><span className="text-gray-500">وضعیت:</span> {venue.status}</p>
          <p><span className="text-gray-500">پلن اشتراک:</span> {venue.subscriptionTier}</p>
          <p><span className="text-gray-500">نرخ کارمزد:</span> {Number(venue.commissionRate).toFixed(0)}٪</p>
          <p><span className="text-gray-500">مختصات:</span> {venue.lat}, {venue.lng}</p>
        </div>
      </Card>

      <ApprovalStages venueId={venueId} onVenueChanged={refreshVenue} />

      {summary && (
        <div className="grid sm:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs text-gray-500">سفارش‌ها (ماه اخیر)</p>
            <p className="text-xl font-bold text-gray-800">{summary.orderCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">فروش کل</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalRevenue.toLocaleString('fa-IR')} تومان</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">کارمزد پلتفرم</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalCommission.toLocaleString('fa-IR')} تومان</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">خالص دریافتی مجموعه</p>
            <p className="text-xl font-bold text-primary-700">{summary.netRevenue.toLocaleString('fa-IR')} تومان</p>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">منو</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {venue.menuItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{item.name}</span>
              <span className="text-gray-500">{Number(item.price).toLocaleString('fa-IR')} تومان</span>
            </div>
          ))}
          {venue.menuItems.length === 0 && <p className="text-gray-500 text-sm">آیتمی ثبت نشده است.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">میزها</h3>
        <div className="flex flex-wrap gap-2">
          {venue.tables.map((table) => (
            <span key={table.id} className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">
              میز {table.tableNumber} {table.isActive ? '' : '(غیرفعال)'}
            </span>
          ))}
          {venue.tables.length === 0 && <p className="text-gray-500 text-sm">میزی ثبت نشده است.</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">آخرین سفارش‌ها</h3>
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{order.table ? `میز ${order.table.tableNumber}` : order.isPickup ? 'پیک‌آپ' : 'سفارش آنلاین'}</span>
              <span className="text-gray-500">{Number(order.totalAmount).toLocaleString('fa-IR')} تومان</span>
              <div className="flex gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-gray-500 text-sm">سفارشی ثبت نشده است.</p>}
        </div>
      </Card>
    </div>
  );
}
