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

// customerOnly tabs disappear for owners/staff/admins — those roles only get
// the universal account pages (profile, notifications, sessions, support).
const groups = [
  {
    title: 'سفارش',
    customerOnly: true,
    tabs: [
      { to: '/account', label: 'سفارش‌ها', icon: ClipboardList, end: true },
      { to: '/account/reviews', label: 'نظرات من', icon: Star },
    ],
  },
  {
    title: 'مالی',
    customerOnly: true,
    tabs: [
      { to: '/account/wallet', label: 'کیف پول', icon: Wallet },
      { to: '/account/loyalty', label: 'امتیازها و نشان‌ها', icon: Award },
      { to: '/account/subscription', label: 'اشتراک تخفیف', icon: Sparkles },
      { to: '/account/referral', label: 'دعوت از دوستان', icon: Gift },
    ],
  },
  {
    title: 'شخصی',
    tabs: [
      { to: '/account/favorites', label: 'موردعلاقه‌ها', icon: Heart, customerOnly: true },
      { to: '/account/notifications', label: 'اعلان‌ها', icon: Bell },
      { to: '/account/profile', label: 'پروفایل', icon: UserRound },
    ],
  },
  {
    title: 'کسب‌وکار',
    customerOnly: true,
    tabs: [{ to: '/account/register-venue', label: 'ثبت کافه من', icon: Store }],
  },
  {
    title: 'سایر',
    tabs: [
      { to: '/account/sessions', label: 'نشست‌ها', icon: MonitorSmartphone },
      { to: '/account/support', label: 'پشتیبانی', icon: LifeBuoy },
      { to: '/account/danger-zone', label: 'حریم خصوصی', icon: ShieldAlert, customerOnly: true },
    ],
  },
];

export default function AccountLayout() {
  const { user } = useAuth();
  const isCustomer = user?.role === 'CUSTOMER';

  const visibleGroups = groups
    .filter((group) => isCustomer || !group.customerOnly)
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => isCustomer || !tab.customerOnly),
    }))
    .filter((group) => group.tabs.length > 0);

  return (
    <div className="animate-fade-up">
      <h1 className="text-xl font-black text-ink mb-4">حساب کاربری</h1>
      <PanelNav groups={visibleGroups} />
      <Outlet />
    </div>
  );
}
