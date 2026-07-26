import { Outlet } from 'react-router-dom';
import {
  ClipboardList,
  Star,
  Wallet,
  Award,
  Heart,
  Bell,
  UserRound,
  MonitorSmartphone,
  LifeBuoy,
  ShieldAlert,
  Store,
  Sparkles,
  Gift,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import PanelNav from '../../components/PanelNav';
import { useLanguage } from '../../context/LanguageContext';

// customerOnly tabs disappear for owners/staff/admins — those roles only get
// the universal account pages (profile, notifications, sessions, support).
function buildGroups(t) {
  return [
    {
      title: t('account.groupOrder'),
      customerOnly: true,
      tabs: [
        { to: '/account', label: t('account.navOrders'), icon: ClipboardList, end: true },
        { to: '/account/reviews', label: t('account.navReviews'), icon: Star },
      ],
    },
    {
      title: t('account.groupFinance'),
      customerOnly: true,
      tabs: [
        { to: '/account/wallet', label: t('account.navWallet'), icon: Wallet },
        { to: '/account/loyalty', label: t('account.navLoyalty'), icon: Award },
        { to: '/account/subscription', label: t('account.navSubscription'), icon: Sparkles },
        { to: '/account/referral', label: t('account.navReferral'), icon: Gift },
      ],
    },
    {
      title: t('account.groupPersonal'),
      tabs: [
        { to: '/account/favorites', label: t('account.navFavorites'), icon: Heart, customerOnly: true },
        { to: '/account/notifications', label: t('account.navNotifications'), icon: Bell },
        { to: '/account/profile', label: t('account.navProfile'), icon: UserRound },
      ],
    },
    {
      title: t('account.groupBusiness'),
      customerOnly: true,
      tabs: [{ to: '/account/register-venue', label: t('account.navRegisterVenue'), icon: Store }],
    },
    {
      title: t('account.groupOther'),
      tabs: [
        { to: '/account/sessions', label: t('account.navSessions'), icon: MonitorSmartphone },
        { to: '/account/support', label: t('account.navSupport'), icon: LifeBuoy },
        { to: '/account/danger-zone', label: t('account.navPrivacy'), icon: ShieldAlert, customerOnly: true },
      ],
    },
  ];
}

export default function AccountLayout() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isCustomer = user?.role === 'CUSTOMER';
  const groups = buildGroups(t);

  const visibleGroups = groups
    .filter((group) => isCustomer || !group.customerOnly)
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => isCustomer || !tab.customerOnly),
    }))
    .filter((group) => group.tabs.length > 0);

  return (
    <div className="animate-fade-up">
      <h1 className="text-xl font-black text-ink mb-4">{t('account.title')}</h1>
      <PanelNav groups={visibleGroups} />
      <Outlet />
    </div>
  );
}
