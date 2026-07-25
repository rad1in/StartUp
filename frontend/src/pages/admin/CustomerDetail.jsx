import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, Ban } from 'lucide-react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';
import Breadcrumb from '../../components/Breadcrumb';
import { SkeletonRows } from '../../components/SkeletonBlock';

export default function CustomerDetail() {
  const { t } = useLanguage();
  const { userId } = useParams();
  const [customer, setCustomer] = useState(null);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');

  async function refresh() {
    const { data } = await api.get(`/admin/customers/${userId}`);
    setCustomer(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function toggleSuspension() {
    const action = !!customer.isSuspended ? 'reactivate' : 'suspend';
    const suspendReason = action === 'suspend' ? window.prompt(t('admin.customerDetail.suspendReasonPrompt')) || undefined : undefined;
    await api.patch(`/admin/customers/${userId}/${action}`, { reason: suspendReason });
    refresh();
  }

  async function adjustLoyalty(e) {
    e.preventDefault();
    if (!points) return;
    await api.patch(`/admin/customers/${userId}/loyalty-adjust`, { points: Number(points), reason });
    setPoints('');
    setReason('');
    refresh();
  }

  if (!customer) {
    return (
      <div>
        <Breadcrumb items={[{ label: t('admin.customerDetail.customersBreadcrumb'), to: '/admin/customers' }, { label: t('common.loading') }]} />
        <SkeletonRows rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: t('admin.customerDetail.customersBreadcrumb'), to: '/admin/customers' }, { label: customer.name }]} />
      <Link to="/admin/customers" className="text-primary-700 text-sm hover:underline">
        <span className="flex items-center gap-1"><ArrowRight size={14} />{t('admin.customerDetail.backToCustomerList')}</span>
      </Link>

      <Card className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{customer.name}</h2>
          <p className="text-sm text-gray-500">{customer.email} — {customer.phone}</p>
          {!!customer.isSuspended && (
            <p className="flex items-center gap-1 text-xs text-ink font-bold mt-1"><Ban size={12} />{t('admin.customerDetail.suspendedPrefix')}: {customer.suspendReason || t('admin.customerDetail.noReasonRecorded')}</p>
          )}
        </div>
        <Button variant={!!customer.isSuspended ? 'primary' : 'danger'} onClick={toggleSuspension}>
          {!!customer.isSuspended ? t('admin.customerDetail.reactivate') : t('admin.customerDetail.suspend')}
        </Button>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.customerDetail.loyaltyBalancePrefix')}: {customer.loyaltyPoints} {t('admin.customerDetail.points')}</h3>
        <form onSubmit={adjustLoyalty} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{t('admin.customerDetail.pointsChangeLabel')}</label>
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1">{t('admin.customerDetail.reasonLabel')}</label>
            <input
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <Button type="submit">{t('admin.customerDetail.applyChange')}</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.customerDetail.loyaltyTransactionsTitle')}</h3>
        <div className="space-y-2">
          {customer.loyaltyTransactions.slice(0, 10).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{tx.type}</span>
              <span className={`font-bold ${Number(tx.points) >= 0 ? 'text-ink' : 'text-ink/50'}`}>{tx.points}</span>
            </div>
          ))}
          {customer.loyaltyTransactions.length === 0 && <p className="text-gray-500 text-sm">{t('admin.customerDetail.noTransactionsRecorded')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.customerDetail.orderHistoryTitle')}</h3>
        <div className="space-y-2">
          {customer.orders.slice(0, 15).map((order) => (
            <div key={order.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{new Date(order.createdAt).toLocaleDateString('fa-IR')}</span>
              <span className="text-gray-500">{Number(order.totalAmount).toLocaleString('fa-IR')} {t('common.toman')}</span>
              <div className="flex gap-2">
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
            </div>
          ))}
          {customer.orders.length === 0 && <p className="text-gray-500 text-sm">{t('admin.customerDetail.noOrdersRecorded')}</p>}
        </div>
      </Card>
    </div>
  );
}
