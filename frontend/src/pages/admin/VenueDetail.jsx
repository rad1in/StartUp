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
import { useLanguage } from '../../context/LanguageContext';

function ApprovalStages({ venueId, onVenueChanged }) {
  const { t } = useLanguage();
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
    if (status === 'REJECTED' && !(await confirm(t('admin.venueDetail.confirmRejectStage'), { danger: true }))) return;
    setBusyKey(stageKey);
    try {
      await api.patch(`/admin/venues/${venueId}/approval-stages/${stageKey}`, {
        status,
        note: noteDrafts[stageKey] || '',
      });
      await refresh();
      onVenueChanged?.();
      toast.success(status === 'COMPLETED' ? t('admin.venueDetail.stageApproved') : t('admin.venueDetail.stageRejected'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.venueDetail.stageUpdateFailed'));
    } finally {
      setBusyKey(null);
    }
  }

  if (!stages) return null;

  return (
    <Card>
      <h3 className="font-semibold text-gray-800 mb-3">{t('admin.venueDetail.registrationApprovalFlow')}</h3>
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
                {stage.note && <p className="text-xs text-gray-500 mt-0.5">{t('admin.venueDetail.noteLabel')}: {stage.note}</p>}
                {stage.status === 'PENDING' && !isBlocked && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                      placeholder={t('admin.venueDetail.noteOptionalPlaceholder')}
                      value={noteDrafts[stage.stageKey] || ''}
                      onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [stage.stageKey]: e.target.value }))}
                    />
                    <button
                      type="button"
                      disabled={busyKey === stage.stageKey}
                      onClick={() => act(stage.stageKey, 'COMPLETED')}
                      className="text-xs font-bold text-green-700 border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50"
                    >
                      {t('admin.venueDetail.approveWord')}
                    </button>
                    <button
                      type="button"
                      disabled={busyKey === stage.stageKey}
                      onClick={() => act(stage.stageKey, 'REJECTED')}
                      className="text-xs font-bold text-red-700 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
                    >
                      {t('admin.venueDetail.rejectWord')}
                    </button>
                  </div>
                )}
                {isBlocked && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock size={11} />
                    {t('admin.venueDetail.waitingForPreviousStage')}
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
  const { t } = useLanguage();
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
    if (!(await confirm(`${t('admin.venueDetail.confirmImpersonatePrefix')} «${venue.name}» ${t('admin.venueDetail.confirmImpersonateSuffix')}`))) return;
    setImpersonating(true);
    try {
      await impersonate(venueId);
      navigate('/venue');
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.venueDetail.impersonateFailed'));
    } finally {
      setImpersonating(false);
    }
  }

  if (!venue) {
    return (
      <div>
        <Breadcrumb items={[{ label: t('admin.venueDetail.venuesBreadcrumb'), to: '/admin/venues' }, { label: t('common.loading') }]} />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: t('admin.venueDetail.venuesBreadcrumb'), to: '/admin/venues' }, { label: venue.name }]} />
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/admin/venues" className="text-primary-700 text-sm hover:underline">
          <span className="flex items-center gap-1"><ArrowRight size={14} />{t('admin.venueDetail.backToVenueList')}</span>
        </Link>
        {user?.role === 'SUPER_ADMIN' && (
          <button
            onClick={handleImpersonate}
            disabled={impersonating}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-full bg-surface-2/60 text-primary-800 border border-primary-200 hover:bg-primary-800 hover:text-white transition-all active:scale-95"
          >
            <UserCog size={14} />
            {impersonating ? t('admin.venueDetail.loggingIn') : t('admin.venueDetail.loginToOwnerPanelSupport')}
          </button>
        )}
      </div>

      <Card>
        <h2 className="text-lg font-bold text-gray-800">{venue.name}</h2>
        <p className="text-sm text-gray-500 mt-1">{venue.description}</p>
        <div className="grid sm:grid-cols-3 gap-3 mt-3 text-sm">
          <p><span className="text-gray-500">{t('admin.venueDetail.addressLabel')}:</span> {venue.address}</p>
          <p><span className="text-gray-500">{t('admin.venueDetail.cityLabel')}:</span> {venue.city || '—'}</p>
          <p><span className="text-gray-500">{t('common.status')}:</span> {venue.status}</p>
          <p><span className="text-gray-500">{t('admin.venueDetail.subscriptionPlanLabel')}:</span> {venue.subscriptionTier}</p>
          <p><span className="text-gray-500">{t('admin.venueDetail.commissionRateLabel')}:</span> {Number(venue.commissionRate).toFixed(0)}٪</p>
          <p><span className="text-gray-500">{t('admin.venueDetail.coordinatesLabel')}:</span> {venue.lat}, {venue.lng}</p>
        </div>
      </Card>

      <ApprovalStages venueId={venueId} onVenueChanged={refreshVenue} />

      {summary && (
        <div className="grid sm:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs text-gray-500">{t('admin.venueDetail.ordersLastMonth')}</p>
            <p className="text-xl font-bold text-gray-800">{summary.orderCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('admin.venueDetail.totalSales')}</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalRevenue.toLocaleString('fa-IR')} {t('common.toman')}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('admin.venueDetail.platformCommission')}</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalCommission.toLocaleString('fa-IR')} {t('common.toman')}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">{t('admin.venueDetail.venueNetRevenue')}</p>
            <p className="text-xl font-bold text-primary-700">{summary.netRevenue.toLocaleString('fa-IR')} {t('common.toman')}</p>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.venueDetail.menuTitle')}</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {venue.menuItems.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{item.name}</span>
              <span className="text-gray-500">{Number(item.price).toLocaleString('fa-IR')} {t('common.toman')}</span>
            </div>
          ))}
          {venue.menuItems.length === 0 && <p className="text-gray-500 text-sm">{t('admin.venueDetail.noItemsRegistered')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.venueDetail.tablesTitle')}</h3>
        <div className="flex flex-wrap gap-2">
          {venue.tables.map((table) => (
            <span key={table.id} className="px-2 py-1 rounded-lg bg-gray-100 text-xs text-gray-700">
              {t('common.table')} {table.tableNumber} {table.isActive ? '' : `(${t('common.inactive')})`}
            </span>
          ))}
          {venue.tables.length === 0 && <p className="text-gray-500 text-sm">{t('admin.venueDetail.noTablesRegistered')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.venueDetail.recentOrders')}</h3>
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{order.table ? `${t('common.table')} ${order.table.tableNumber}` : order.isPickup ? t('common.pickup') : t('common.onlineOrder')}</span>
              <span className="text-gray-500">{Number(order.totalAmount).toLocaleString('fa-IR')} {t('common.toman')}</span>
              <div className="flex gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-gray-500 text-sm">{t('admin.venueDetail.noOrdersRegistered')}</p>}
        </div>
      </Card>
    </div>
  );
}
