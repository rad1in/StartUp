import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Armchair,
  BookOpen,
  SlidersHorizontal,
  Sparkles,
  Calculator,
  Users,
  MessageSquare,
  Megaphone,
  TrendingUp,
  Package,
  GitBranch,
  Settings,
  ChefHat,
  CalendarClock,
  Crown,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useVenuePermissions } from '../../hooks/useVenuePermissions';
import BranchSwitcher, { setActiveBranch } from '../../components/BranchSwitcher';
import PanelNav from '../../components/PanelNav';
import Loader from '../../components/Loader';
import ThemeToggle from '../../components/ThemeToggle';

// Tabs clustered by task so owners scan 3 short rows instead of one wall of 14.
const groups = [
  {
    title: 'روزانه',
    tabs: [
      { to: '/venue', label: 'داشبورد', icon: LayoutDashboard, end: true, permission: null },
      { to: '/venue/orders', label: 'سفارش‌ها', icon: ClipboardList, permission: 'orders.view' },
      { to: '/venue/kds', label: 'نمایشگر آشپزخانه', icon: ChefHat, permission: 'orders.manage' },
      { to: '/venue/tables', label: 'میزها', icon: Armchair, permission: 'tables.view' },
      { to: '/venue/reservations', label: 'رزرو میز', icon: CalendarClock, permission: 'orders.view' },
    ],
  },
  {
    title: 'منو',
    tabs: [
      { to: '/venue/menu', label: 'مدیریت منو', icon: BookOpen, permission: 'menu.manage' },
      { to: '/venue/modifier-groups', label: 'سفارشی‌سازی', icon: SlidersHorizontal, permission: 'menu.manage' },
      { to: '/venue/pairing-rules', label: 'پیشنهاد مکمل', icon: Sparkles, permission: 'menu.manage' },
    ],
  },
  {
    title: 'کسب‌وکار',
    tabs: [
      { to: '/venue/accounting', label: 'حسابداری', icon: Calculator, permission: 'accounting.view' },
      { to: '/venue/staff', label: 'کارمندان', icon: Users, permission: 'staff.manage' },
      { to: '/venue/shifts', label: 'شیفت‌ها', icon: Clock, permission: null },
      { to: '/venue/feedback', label: 'نظرات مشتریان', icon: MessageSquare, permission: 'feedback.manage' },
      { to: '/venue/marketing', label: 'بازاریابی', icon: Megaphone, permission: 'marketing.manage' },
      { to: '/venue/crm', label: 'مشتریان وفادار', icon: Crown, permission: 'marketing.manage' },
      { to: '/venue/forecasting', label: 'پیش‌بینی فروش', icon: TrendingUp, permission: null, ownerOnly: true },
      { to: '/venue/inventory', label: 'انبارداری', icon: Package, permission: null, ownerOnly: true },
      { to: '/venue/branches', label: 'شعبات', icon: GitBranch, permission: null, ownerOnly: true },
      { to: '/venue/settings', label: 'تنظیمات', icon: Settings, permission: 'settings.manage' },
    ],
  },
];

export default function VenueLayout() {
  const { has, loading } = useVenuePermissions();
  const { user } = useAuth();

  if (loading) {
    return <Loader text="در حال بارگذاری پنل" />;
  }

  const isOwner = user?.role === 'VENUE_OWNER' || user?.role === 'SUPER_ADMIN';
  const visibleGroups = groups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => {
        if (tab.ownerOnly && !isOwner) return false;
        if (tab.permission && !has(tab.permission)) return false;
        return true;
      }),
    }))
    .filter((group) => group.tabs.length > 0);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h1 className="text-xl font-black text-ink">پنل مدیریت مجموعه</h1>
        <div className="flex items-center gap-2">
          <BranchSwitcher onBranchChange={(venue) => setActiveBranch(venue)} />
          <ThemeToggle />
        </div>
      </div>
      <PanelNav groups={visibleGroups} />
      <Outlet />
    </div>
  );
}
