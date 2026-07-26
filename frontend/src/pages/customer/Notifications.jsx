import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Gift, Award, Info, Star } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useCustomerSocket } from '../../hooks/useCustomerSocket';
import Card from '../../components/Card';
import Button from '../../components/Button';
import PushNotificationToggle from '../../components/PushNotificationToggle';
import { useLanguage } from '../../context/LanguageContext';

const CUSTOMER_CATEGORIES = ['ORDER_STATUS', 'PROMO', 'LOYALTY', 'SYSTEM'];
const TYPE_META = {
  ORDER_STATUS: { icon: ShoppingBag, color: 'text-accent-600 bg-accent-50' },
  NEW_ORDER: { icon: ShoppingBag, color: 'text-accent-600 bg-accent-50' },
  PROMO: { icon: Gift, color: 'text-green-600 bg-green-50' },
  LOYALTY: { icon: Award, color: 'text-accent-600 bg-accent-50' },
  SYSTEM: { icon: Info, color: 'text-gray-500 bg-gray-100' },
  LOW_REVIEW: { icon: Star, color: 'text-red-600 bg-red-50' },
};

function isToday(dateStr) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const TYPE_LABELS = {
    ORDER_STATUS: t('notif.typeOrderStatus'),
    PROMO: t('notif.typePromo'),
    LOYALTY: t('notif.typeLoyalty'),
    SYSTEM: t('notif.typeSystem'),
  };
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState([]);

  async function refresh() {
    const { data } = await api.get('/notifications');
    setNotifications(data);
  }

  useEffect(() => {
    refresh();
    api
      .get('/notifications/preferences')
      .then(({ data }) => setPreferences(data.filter((p) => CUSTOMER_CATEGORIES.includes(p.category))));
  }, []);

  useCustomerSocket(user?.id, {
    'notification:new': (notification) => setNotifications((prev) => [notification, ...prev]),
  });

  async function markRead(id) {
    await api.patch(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  function handleClick(n) {
    if (!n.isRead) markRead(n.id);
    const data = n.data || {};
    if (data.orderId) navigate(`/account/orders/${data.orderId}`);
    else if (data.ticketId) navigate('/account/support');
    else if (data.reviewId) navigate('/account/reviews');
  }

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  async function togglePreference(category, enabled) {
    await api.patch('/notifications/preferences', { category, enabled });
    setPreferences((prev) => prev.map((p) => (p.category === category ? { ...p, enabled } : p)));
  }

  return (
    <div className="space-y-6 max-w-lg">
      <PushNotificationToggle />

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('notif.settingsTitle')}</h3>
        <div className="space-y-2">
          {preferences.map((pref) => (
            <label key={pref.category} className="flex items-center justify-between text-sm">
              <span>{TYPE_LABELS[pref.category] || pref.category}</span>
              <input
                type="checkbox"
                checked={pref.enabled}
                onChange={(e) => togglePreference(pref.category, e.target.checked)}
              />
            </label>
          ))}
        </div>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{t('notif.title')}</h3>
          <Button variant="ghost" onClick={markAllRead}>
            {t('notif.markAllRead')}
          </Button>
        </div>
        {notifications.length === 0 && <p className="text-gray-500 text-sm">{t('notif.empty')}</p>}

        {['today', 'earlier'].map((group) => {
          const groupItems = notifications.filter((n) => (group === 'today' ? isToday(n.createdAt) : !isToday(n.createdAt)));
          if (groupItems.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <p className="text-xs font-bold text-primary-700 mb-2">{group === 'today' ? t('notif.today') : t('notif.earlier')}</p>
              <div className="space-y-2">
                {groupItems.map((n) => {
                  const meta = TYPE_META[n.type] || TYPE_META.SYSTEM;
                  const Icon = meta.icon;
                  return (
                    <Card
                      key={n.id}
                      className={`cursor-pointer flex items-start gap-3 ${!n.isRead ? 'border-primary-300 bg-primary-50' : ''}`}
                      onClick={() => handleClick(n)}
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.color}`}>
                        <Icon size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-gray-800 truncate ${!n.isRead ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary-600 shrink-0" />}
                        </div>
                        {n.body && <p className="text-sm text-gray-600 mt-1">{n.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString('fa-IR')}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
