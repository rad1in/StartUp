import { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenueSocket } from '../../hooks/useSocket';
import { useVenuePermissions } from '../../hooks/useVenuePermissions';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { OrderStatusBadge, PaymentStatusBadge } from '../../components/OrderStatusBadge';

const NEXT_STATUS = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' };
const NEXT_LABEL = {
  PENDING: 'شروع آماده‌سازی',
  PREPARING: 'آماده شد',
  READY: 'علامت‌گذاری به‌عنوان سرو شده',
};
const COLUMNS = [
  { key: 'PENDING', label: 'جدید' },
  { key: 'PREPARING', label: 'در حال آماده‌سازی' },
  { key: 'READY', label: 'آماده سرو' },
  { key: 'SERVED', label: 'سرو شده' },
];

export default function Orders() {
  const { user } = useAuth();
  const { has } = useVenuePermissions();
  const venueId = user?.venueId;
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: '', from: '', to: '' });
  const [expandedId, setExpandedId] = useState(null);
  const [activity, setActivity] = useState([]);
  const [discountForm, setDiscountForm] = useState({ discountAmount: '', discountReason: '' });
  const [waiterCalls, setWaiterCalls] = useState([]);

  async function refresh() {
    if (!venueId) return;
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data } = await api.get(`/orders/venue/${venueId}`, { params });
    setOrders(data);
  }

  async function refreshWaiterCalls() {
    if (!venueId) return;
    const { data } = await api.get(`/waiter-calls/venue/${venueId}`);
    setWaiterCalls(data);
  }

  useEffect(() => {
    refresh();
    refreshWaiterCalls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, filters]);

  useVenueSocket(venueId, {
    'order:new': (order) => setOrders((prev) => [order, ...prev]),
    'order:updated': (order) =>
      setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, ...order } : o))),
    'waiterCall:new': (call) => setWaiterCalls((prev) => [...prev, call]),
    'waiterCall:resolved': (call) => setWaiterCalls((prev) => prev.filter((c) => c.id !== call.id)),
  });

  async function resolveWaiterCall(call) {
    await api.patch(`/waiter-calls/venue/${venueId}/${call.id}/resolve`);
    setWaiterCalls((prev) => prev.filter((c) => c.id !== call.id));
  }

  async function advanceStatus(order) {
    const nextStatus = NEXT_STATUS[order.status];
    if (!nextStatus) return;
    await api.patch(`/orders/${order.id}/status`, { status: nextStatus });
  }

  async function voidOrder(order) {
    const reason = window.prompt('دلیل لغو/استرداد سفارش را وارد کنید:');
    if (reason === null) return;
    await api.post(`/orders/${order.id}/void`, { reason });
  }

  async function toggleExpand(order) {
    if (expandedId === order.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(order.id);
    setDiscountForm({ discountAmount: order.discountAmount || '', discountReason: order.discountReason || '' });
    const { data } = await api.get(`/orders/${order.id}/activity`);
    setActivity(data);
  }

  async function applyDiscount(order) {
    await api.patch(`/orders/${order.id}/discount`, {
      discountAmount: Number(discountForm.discountAmount) || 0,
      discountReason: discountForm.discountReason,
    });
  }

  async function adjustQuantity(order, item, delta) {
    const newItems = order.items
      .map((i) =>
        i.id === item.id
          ? { menuItemId: i.menuItemId, comboId: i.comboId, quantity: i.quantity + delta }
          : { menuItemId: i.menuItemId, comboId: i.comboId, quantity: i.quantity }
      )
      .filter((i) => i.quantity > 0);
    await api.patch(`/orders/${order.id}/items`, { items: newItems });
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;
  const canManage = has('orders.manage');

  return (
    <div>
      {waiterCalls.length > 0 && (
        <div className="mb-4 space-y-2">
          {waiterCalls.map((call) => (
            <div
              key={call.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
            >
              <div className="flex items-center gap-2 text-amber-800">
                <BellRing size={18} className="shrink-0 animate-pulse" />
                <p className="text-sm font-bold">
                  میز {call.tableNumber} درخواست کمک دارد
                  {call.note ? ` — ${call.note}` : ''}
                </p>
              </div>
              <Button variant="secondary" onClick={() => resolveWaiterCall(call)}>
                رسیدگی شد
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card className="mb-4">
        <div className="grid sm:grid-cols-3 gap-2">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            {[...COLUMNS.map((c) => c.key), 'CANCELLED'].map((s) => (
              <option key={s} value={s}>
                {s}
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

      <div className="grid md:grid-cols-4 gap-4">
        {COLUMNS.map((column) => (
          <div key={column.key}>
            <h3 className="font-semibold text-gray-700 mb-2 text-sm">{column.label}</h3>
            <div className="space-y-3">
              {orders
                .filter((o) => o.status === column.key)
                .map((order) => (
                  <Card key={order.id}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800 text-sm">
                        {order.table ? `میز ${order.table.tableNumber}` : order.isPickup ? 'پیک‌آپ' : 'آنلاین'}
                      </p>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </div>
                    <ul className="text-xs text-gray-500 mb-2">
                      {order.items.map((item) => (
                        <li key={item.id}>
                          {item.menuItem?.name || item.combo?.name} — {item.quantity} عدد
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm font-bold text-primary-700 mb-2">
                      {Number(order.totalAmount).toLocaleString('fa-IR')} تومان
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {canManage && NEXT_STATUS[order.status] && (
                        <Button variant="secondary" onClick={() => advanceStatus(order)}>
                          {NEXT_LABEL[order.status]}
                        </Button>
                      )}
                      {canManage && order.status !== 'CANCELLED' && (
                        <Button variant="danger" onClick={() => voidOrder(order)}>
                          لغو/استرداد
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => toggleExpand(order)}>
                        جزئیات
                      </Button>
                    </div>

                    {expandedId === order.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                        {order.paymentStatus === 'PENDING' && canManage && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">ویرایش اقلام</p>
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-xs mb-1">
                                <span>{item.menuItem?.name || item.combo?.name}</span>
                                <div className="flex items-center gap-1">
                                  <button
                                    className="w-5 h-5 bg-gray-200 rounded"
                                    onClick={() => adjustQuantity(order, item, -1)}
                                  >
                                    -
                                  </button>
                                  <span>{item.quantity}</span>
                                  <button
                                    className="w-5 h-5 bg-gray-200 rounded"
                                    onClick={() => adjustQuantity(order, item, 1)}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ))}

                            <p className="text-xs font-semibold text-gray-600 mt-2 mb-1">تخفیف دستی</p>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
                                placeholder="مبلغ"
                                value={discountForm.discountAmount}
                                onChange={(e) => setDiscountForm({ ...discountForm, discountAmount: e.target.value })}
                              />
                              <input
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                                placeholder="دلیل تخفیف"
                                value={discountForm.discountReason}
                                onChange={(e) => setDiscountForm({ ...discountForm, discountReason: e.target.value })}
                              />
                              <Button variant="secondary" onClick={() => applyDiscount(order)}>
                                ثبت
                              </Button>
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">تاریخچه فعالیت</p>
                          {activity.length === 0 && <p className="text-xs text-gray-400">فعالیتی ثبت نشده است.</p>}
                          {activity.map((entry) => (
                            <p key={entry.id} className="text-xs text-gray-500">
                              {entry.userName || 'سیستم'} — {entry.action} —{' '}
                              {new Date(entry.createdAt).toLocaleString('fa-IR')}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
