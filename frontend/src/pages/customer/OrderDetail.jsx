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

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
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
    if (!window.confirm('آیا از لغو این سفارش مطمئن هستید؟')) return;
    try {
      const { data } = await api.post(`/orders/${id}/cancel`);
      setOrder((prev) => ({ ...prev, ...data }));
      toast.success('سفارش شما لغو شد.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'لغو سفارش با خطا مواجه شد.');
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
      toast.error('فاکتور رسمی برای این سفارش صادر نشده است.');
    }
  }

  async function sendReceiptSms() {
    setSendingSms(true);
    try {
      await api.post(`/orders/${id}/receipt/sms`);
      toast.success('فیش سفارش با پیامک ارسال شد.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'ارسال پیامک ناموفق بود.');
    } finally {
      setSendingSms(false);
    }
  }

  async function sendReceiptEmail() {
    setSendingEmail(true);
    try {
      await api.post(`/orders/${id}/receipt/email`);
      toast.success('فیش سفارش با ایمیل ارسال شد.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'ارسال ایمیل ناموفق بود.');
    } finally {
      setSendingEmail(false);
    }
  }

  if (!order) return <p className="text-gray-500">در حال بارگذاری سفارش...</p>;

  return (
    <div className="max-w-lg">
      <Link to="/account" className="text-sm text-primary-700">
        &rarr; بازگشت به سفارش‌ها
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

        <p className="text-xs text-gray-500 mb-1">شماره سفارش: {order.id}</p>
        <p className="text-xs text-gray-500 mb-1">تاریخ ثبت: {new Date(order.createdAt).toLocaleString('fa-IR')}</p>
        {order.table && <p className="text-xs text-gray-500 mb-3">میز: {order.table.tableNumber}</p>}

        <ul className="divide-y divide-gray-100 my-3">
          {order.items.map((item) => (
            <li key={item.id} className="py-2 flex items-center justify-between text-sm">
              <span>
                {item.menuItem.name} — {item.quantity} عدد
              </span>
              <span>{Number(item.subtotal).toLocaleString('fa-IR')} تومان</span>
            </li>
          ))}
        </ul>

        {Number(order.discountAmount) > 0 && (
          <div className="mb-1">
            <div className="flex items-center justify-between text-sm text-ink font-medium">
              <span>تخفیف</span>
              <span>-{Number(order.discountAmount).toLocaleString('fa-IR')} تومان</span>
            </div>
            {order.discountReason && <p className="text-xs text-ink/40 mt-0.5">{order.discountReason}</p>}
          </div>
        )}
        <div className="flex items-center justify-between font-bold mb-4">
          <span>جمع کل</span>
          <span>{Number(order.totalAmount).toLocaleString('fa-IR')} تومان</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={handleReorder}>سفارش مجدد</Button>
          <Button variant="secondary" onClick={downloadReceipt}>
            دریافت فاکتور
          </Button>
          <Button variant="secondary" onClick={downloadTaxInvoice}>
            دریافت فاکتور رسمی مالیاتی
          </Button>
          <Button variant="secondary" onClick={sendReceiptSms} disabled={sendingSms}>
            {sendingSms ? 'در حال ارسال...' : 'ارسال فیش با پیامک'}
          </Button>
          <Button variant="secondary" onClick={sendReceiptEmail} disabled={sendingEmail}>
            {sendingEmail ? 'در حال ارسال...' : 'ارسال فیش با ایمیل'}
          </Button>
          {order.status === 'PENDING' && (
            <Button variant="danger" onClick={cancelOrder}>
              لغو سفارش
            </Button>
          )}
          {order.status === 'SERVED' && (
            <Link to={`/account/reviews?orderId=${order.id}&venueId=${order.venueId}`}>
              <Button variant="ghost">ثبت نظر</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
