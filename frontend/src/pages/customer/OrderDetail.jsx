import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useCustomerSocket } from '../../hooks/useCustomerSocket';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';
import OrderProgressTimeline from '../../components/OrderProgressTimeline';
import { useLanguage } from '../../context/LanguageContext';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();
  const [order, setOrder] = useState(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  async function refresh() {
    const { data } = await api.get(`/orders/${id}`);
    setOrder(data);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useCustomerSocket(user?.id, {
    'order:updated': (updated) => {
      if (updated.id === id) setOrder((prev) => ({ ...prev, ...updated }));
    },
  });

  async function cancelOrder() {
    if (!window.confirm(t('orderDetail.confirmCancel'))) return;
    try {
      const { data } = await api.post(`/orders/${id}/cancel`);
      setOrder((prev) => ({ ...prev, ...data }));
      toast.success(t('orderDetail.cancelSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderDetail.cancelError'));
    }
  }

  async function handleReorder() {
    const { data } = await api.post(`/orders/${id}/reorder`);
    navigate(`/menu/${data.venueId}`, { state: { reorderItems: data.items } });
  }

  async function downloadReceipt() {
    const { data } = await api.get(`/orders/${id}/receipt.pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }

  async function downloadTaxInvoice() {
    try {
      const { data } = await api.get(`/orders/${id}/tax-invoice.pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error(t('orderDetail.taxInvoiceError'));
    }
  }

  async function sendReceiptSms() {
    setSendingSms(true);
    try {
      await api.post(`/orders/${id}/receipt/sms`);
      toast.success(t('orderDetail.smsSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderDetail.smsError'));
    } finally {
      setSendingSms(false);
    }
  }

  async function sendReceiptEmail() {
    setSendingEmail(true);
    try {
      await api.post(`/orders/${id}/receipt/email`);
      toast.success(t('orderDetail.emailSuccess'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderDetail.emailError'));
    } finally {
      setSendingEmail(false);
    }
  }

  if (!order) return <p className="text-gray-500">{t('orderDetail.loading')}</p>;

  return (
    <div className="max-w-lg">
      <Link to="/account" className="text-sm text-primary-700">
        &rarr; {t('orderDetail.backToOrders')}
      </Link>

      <div className="mt-3">
        <OrderProgressTimeline order={order} />
      </div>

      <Card className="mt-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-800">{order.venue?.name}</h2>
          <div className="flex gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-1">{t('orderDetail.orderNumber')} {order.id}</p>
        <p className="text-xs text-gray-500 mb-1">{t('orderDetail.orderDate')} {new Date(order.createdAt).toLocaleString('fa-IR')}</p>
        {order.table && <p className="text-xs text-gray-500 mb-3">{t('orderDetail.tableLabel')} {order.table.tableNumber}</p>}

        <ul className="divide-y divide-gray-100 my-3">
          {order.items.map((item) => (
            <li key={item.id} className="py-2 flex items-center justify-between text-sm">
              <span>
                {item.menuItem.name} — {item.quantity} {t('orderDetail.itemUnitSuffix')}
              </span>
              <span>{Number(item.subtotal).toLocaleString('fa-IR')} {t('menu.toman')}</span>
            </li>
          ))}
        </ul>

        {Number(order.discountAmount) > 0 && (
          <div className="mb-1">
            <div className="flex items-center justify-between text-sm text-ink font-medium">
              <span>{t('account.discount')}</span>
              <span>-{Number(order.discountAmount).toLocaleString('fa-IR')} {t('menu.toman')}</span>
            </div>
            {order.discountReason && <p className="text-xs text-ink/40 mt-0.5">{order.discountReason}</p>}
          </div>
        )}
        <div className="flex items-center justify-between font-bold mb-4">
          <span>{t('account.total')}</span>
          <span>{Number(order.totalAmount).toLocaleString('fa-IR')} {t('menu.toman')}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleReorder}>{t('account.reorder')}</Button>
          <Button variant="secondary" onClick={downloadReceipt}>
            {t('account.downloadReceipt')}
          </Button>
          <Button variant="secondary" onClick={downloadTaxInvoice}>
            {t('orderDetail.taxInvoice')}
          </Button>
          <Button variant="secondary" onClick={sendReceiptSms} disabled={sendingSms}>
            {sendingSms ? t('account.sending') : t('orderDetail.sendSms')}
          </Button>
          <Button variant="secondary" onClick={sendReceiptEmail} disabled={sendingEmail}>
            {sendingEmail ? t('account.sending') : t('orderDetail.sendEmail')}
          </Button>
          {order.status === 'PENDING' && (
            <Button variant="danger" onClick={cancelOrder}>
              {t('orderDetail.cancelOrder')}
            </Button>
          )}
          {order.status === 'SERVED' && (
            <Link to={`/account/reviews?orderId=${order.id}&venueId=${order.venueId}`}>
              <Button variant="ghost">{t('orderDetail.writeReview')}</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
