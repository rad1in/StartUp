import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Store,
  Users,
  UserCog,
  Receipt,
  FileText,
  Plug,
  BarChart3,
  ShieldCheck,
  ScrollText,
  Trophy,
  Brain,
  Calculator,
  AlertTriangle,
  Ticket,
  LifeBuoy,
  Layers,
  Megaphone,
  Search,
  Activity,
  Sparkles,
  Rows3,
  Rows4,
  DatabaseBackup,
  MessageSquare,
} from 'lucide-react';
import { useAdminPermissions } from '../../hooks/useAdminPermissions';
import { useAuth } from '../../hooks/useAuth';
import { useDensity } from '../../context/DensityContext';
import PanelNav from '../../components/PanelNav';
import Loader from '../../components/Loader';
import CommandPalette from '../../components/CommandPalette';
import ThemeToggle from '../../components/ThemeToggle';
import AdminNotificationBell from '../../components/AdminNotificationBell';

const groups = [
  {
    title: 'عملیات',
    tabs: [
      { to: '/admin', label: 'داشبورد', icon: LayoutDashboard, end: true, permission: null },
      { to: '/admin/live-ops', label: 'عملیات زنده', icon: Activity, permission: 'security.manage' },
      { to: '/admin/venues', label: 'مجموعه‌ها', icon: Store, permission: 'venues.manage' },
      { to: '/admin/customers', label: 'مشتریان', icon: Users, permission: 'customers.manage' },
      { to: '/admin/staff', label: 'کارمندان پلتفرم', icon: UserCog, permission: null, ownerOnly: true },
      { to: '/admin/tickets', label: 'تیکت‌های داخلی', icon: Ticket, permission: null },
      { to: '/admin/support', label: 'پشتیبانی مشتریان', icon: LifeBuoy, permission: 'customers.manage' },
      { to: '/admin/broadcast', label: 'اعلان همگانی', icon: Megaphone, permission: null, ownerOnly: true },
      { to: '/admin/sms-campaigns', label: 'کمپین‌های پیامکی', icon: MessageSquare, permission: 'sms.manage' },
    ],
  },
  {
    title: 'مالی',
    tabs: [
      { to: '/admin/billing', label: 'مالی و صورتحساب', icon: Receipt, permission: 'billing.manage' },
      { to: '/admin/platform-accounting', label: 'حسابداری پلتفرم', icon: Calculator, permission: 'billing.manage' },
      { to: '/admin/plan-config', label: 'مدیریت پلن‌ها', icon: Layers, permission: null, ownerOnly: true },
      { to: '/admin/subscriptions', label: 'اشتراک تخفیف مشتریان', icon: Sparkles, permission: 'billing.manage' },
    ],
  },
  {
    title: 'تحلیل',
    tabs: [
      { to: '/admin/reports', label: 'گزارش‌ها', icon: BarChart3, permission: 'reports.view' },
      { to: '/admin/bi', label: 'هوش تجاری (BI)', icon: Brain, permission: 'reports.view' },
      { to: '/admin/gamification', label: 'گیمیفیکیشن', icon: Trophy, permission: null, ownerOnly: true },
      { to: '/admin/content', label: 'محتوا', icon: FileText, permission: 'content.manage' },
      { to: '/admin/content-center', label: 'محتوای متمرکز مجموعه‌ها', icon: Layers, permission: 'venues.manage' },
      { to: '/admin/integrations', label: 'یکپارچه‌سازی‌ها', icon: Plug, permission: 'integrations.manage' },
    ],
  },
  {
    title: 'امنیت',
    tabs: [
      { to: '/admin/security', label: 'امنیت', icon: ShieldCheck, permission: 'security.manage' },
      { to: '/admin/audit-log', label: 'گزارش رویدادها', icon: ScrollText, permission: 'security.manage' },
      { to: '/admin/fraud', label: 'تشخیص تقلب', icon: AlertTriangle, permission: 'security.manage' },
      { to: '/admin/db-backup', label: 'پشتیبان‌گیری دیتابیس', icon: DatabaseBackup, permission: null, ownerOnly: true },
    ],
  },
];

export default function AdminLayout() {
  const { has, isOwner, loading } = useAdminPermissions();
  const { user } = useAuth();
  const { dense, toggleDense } = useDensity();

  if (loading) {
    return <Loader text="در حال بارگذاری پنل" />;
  }

  const visibleGroups = groups
    .map((group) => ({
      ...group,
      tabs: group.tabs.filter((tab) => {
        if (tab.ownerOnly) return user?.role === 'SUPER_ADMIN';
        return !tab.permission || has(tab.permission);
      }),
    }))
    .filter((group) => group.tabs.length > 0);

  const openPalette = () =>
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));

  return (
    <div className="animate-fade-up">
      <CommandPalette />
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-black text-ink">پنل مدیریت کل پلتفرم</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="hidden sm:inline-flex items-center gap-2 text-xs text-ink/50 bg-surface-2/60 hover:bg-surface-2 border border-black/10 rounded-full pr-2.5 pl-2 py-1.5 transition-colors"
          >
            <Search size={14} />
            جستجوی سراسری
            <span className="chip-gold text-[10px] py-0">Ctrl K</span>
          </button>
          {isOwner && <span className="chip-gold">دسترسی کامل</span>}
          <AdminNotificationBell />
          <button
            type="button"
            onClick={toggleDense}
            title={dense ? 'حالت راحت' : 'حالت فشرده'}
            className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink shrink-0"
          >
            {dense ? <Rows4 size={16} /> : <Rows3 size={16} />}
          </button>
          <ThemeToggle />
        </div>
      </div>
      <PanelNav groups={visibleGroups} />
      <Outlet />
    </div>
  );
}
