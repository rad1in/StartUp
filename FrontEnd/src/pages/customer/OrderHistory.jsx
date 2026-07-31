import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useCustomerSocket } from '../../hooks/useCustomerSocket';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

export default function OrderHistory() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const STATUS_OPTIONS = [
    { value: '', label: t('orderHistory.statusAll') },
    { value: 'PENDING', label: t('orderHistory.statusPending') },
    { value: 'PREPARING', label: t('orderHistory.statusPreparing') },
    { value: 'SERVED', label: t('orderHistory.statusServed') },
    { value: 'CANCELLED', label: t('orderHistory.statusCancelled') },
  ];
  const [orders, setOrders] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ venueId: '', status: '', from: '', to: '' });

  async function refresh() {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get('/customers/orders', { params });
    setOrders(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    api.get('/venues').then(({ data }) => setVenues(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useCustomerSocket(user?.id, {
    'order:new': () => refresh(),
    'order:updated': (updated) =>
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o))),
  });

  return (
    <div>
      <Card className="mb-4">
        <div className="grid sm:grid-cols-4 gap-2">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.venueId}
            onChange={(e) => setFilters({ ...filters, venueId: e.target.value })}
          >
            <option value="">{t('orderHistory.allVenues')}</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.from}
            onChange={(e) => setFilters({ ...filters, from: e.target.value })}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.to}
            onChange={(e) => setFilters({ ...filters, to: e.target.value })}
          />
        </div>
      </Card>

      {loading && <p className="text-gray-500">{t('orderHistory.loading')}</p>}
      {!loading && orders.length === 0 && <p className="text-gray-500">{t('orderHistory.noOrders')}</p>}

      <div className="space-y-3">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

function OrderRow({ order }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { t, n, dateShort } = useLanguage();

  async function downloadReceipt() {
    const { data } = await api.get(`/orders/${order.id}/receipt.pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }

  async function reorder() {
    try {
      const { data } = await api.post(`/orders/${order.id}/reorder`);
      navigate(`/menu/${data.venueId}`, { state: { reorderItems: data.items } });
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderHistory.reorderError'));
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="font-medium text-gray-800">{order.venue?.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            {dateShort(order.createdAt)} — {order.items.length} {t('orderHistory.itemsCountSuffix')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="font-bold text-primary-700">{n(Number(order.totalAmount))} {t('menu.toman')}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <Link to={`/account/orders/${order.id}`}>
          <Button variant="secondary">{t('account.viewDetails')}</Button>
        </Link>
        <Button variant="ghost" onClick={downloadReceipt}>
          {t('account.downloadReceipt')}
        </Button>
        <Button variant="ghost" onClick={reorder}>
          {t('account.reorder')}
        </Button>
      </div>
    </Card>
  );
}
