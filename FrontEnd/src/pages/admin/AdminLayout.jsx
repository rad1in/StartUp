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
import { useLanguage } from '../../context/LanguageContext';
import PanelNav from '../../components/PanelNav';
import Loader from '../../components/Loader';
import CommandPalette from '../../components/CommandPalette';
import ThemeToggle from '../../components/ThemeToggle';
import AdminNotificationBell from '../../components/AdminNotificationBell';

function buildGroups(t) {
  return [
    {
      title: t('admin.adminLayout.groupOperations'),
      tabs: [
        { to: '/admin', label: t('admin.adminLayout.navDashboard'), icon: LayoutDashboard, end: true, permission: null },
        { to: '/admin/live-ops', label: t('admin.adminLayout.navLiveOps'), icon: Activity, permission: 'security.manage' },
        { to: '/admin/venues', label: t('admin.adminLayout.navVenues'), icon: Store, permission: 'venues.manage' },
        { to: '/admin/customers', label: t('admin.adminLayout.navCustomers'), icon: Users, permission: 'customers.manage' },
        { to: '/admin/staff', label: t('admin.adminLayout.navPlatformStaff'), icon: UserCog, permission: null, ownerOnly: true },
        { to: '/admin/tickets', label: t('admin.adminLayout.navInternalTickets'), icon: Ticket, permission: null },
        { to: '/admin/support', label: t('admin.adminLayout.navSupport'), icon: LifeBuoy, permission: 'customers.manage' },
        { to: '/admin/broadcast', label: t('admin.adminLayout.navBroadcast'), icon: Megaphone, permission: null, ownerOnly: true },
        { to: '/admin/sms-campaigns', label: t('admin.adminLayout.navSmsCampaigns'), icon: MessageSquare, permission: 'sms.manage' },
      ],
    },
    {
      title: t('admin.adminLayout.groupFinance'),
      tabs: [
        { to: '/admin/billing', label: t('admin.adminLayout.navBilling'), icon: Receipt, permission: 'billing.manage' },
        { to: '/admin/platform-accounting', label: t('admin.adminLayout.navPlatformAccounting'), icon: Calculator, permission: 'billing.manage' },
        { to: '/admin/plan-config', label: t('admin.adminLayout.navPlanConfig'), icon: Layers, permission: null, ownerOnly: true },
        { to: '/admin/subscriptions', label: t('admin.adminLayout.navSubscriptions'), icon: Sparkles, permission: 'billing.manage' },
      ],
    },
    {
      title: t('admin.adminLayout.groupAnalytics'),
      tabs: [
        { to: '/admin/reports', label: t('admin.adminLayout.navReports'), icon: BarChart3, permission: 'reports.view' },
        { to: '/admin/bi', label: t('admin.adminLayout.navBi'), icon: Brain, permission: 'reports.view' },
        { to: '/admin/gamification', label: t('admin.adminLayout.navGamification'), icon: Trophy, permission: null, ownerOnly: true },
        { to: '/admin/content', label: t('admin.adminLayout.navContent'), icon: FileText, permission: 'content.manage' },
        { to: '/admin/content-center', label: t('admin.adminLayout.navContentCenter'), icon: Layers, permission: 'venues.manage' },
        { to: '/admin/integrations', label: t('admin.adminLayout.navIntegrations'), icon: Plug, permission: 'integrations.manage' },
      ],
    },
    {
      title: t('admin.adminLayout.groupSecurity'),
      tabs: [
        { to: '/admin/security', label: t('admin.adminLayout.navSecurity'), icon: ShieldCheck, permission: 'security.manage' },
        { to: '/admin/audit-log', label: t('admin.adminLayout.navAuditLog'), icon: ScrollText, permission: 'security.manage' },
        { to: '/admin/fraud', label: t('admin.adminLayout.navFraud'), icon: AlertTriangle, permission: 'security.manage' },
        { to: '/admin/db-backup', label: t('admin.adminLayout.navDbBackup'), icon: DatabaseBackup, permission: null, ownerOnly: true },
      ],
    },
  ];
}

export default function AdminLayout() {
  const { t } = useLanguage();
  const { has, isOwner, loading } = useAdminPermissions();
  const { user } = useAuth();
  const { dense, toggleDense } = useDensity();

  if (loading) {
    return <Loader text={t('admin.adminLayout.loadingPanel')} />;
  }

  const groups = buildGroups(t);

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
        <h1 className="text-xl font-black text-ink">{t('admin.adminLayout.title')}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openPalette}
            className="hidden sm:inline-flex items-center gap-2 text-xs text-ink/50 bg-surface-2/60 hover:bg-surface-2 border border-black/10 rounded-full pr-2.5 pl-2 py-1.5 transition-colors"
          >
            <Search size={14} />
            {t('admin.adminLayout.globalSearch')}
            <span className="chip-gold text-[10px] py-0">Ctrl K</span>
          </button>
          {isOwner && <span className="chip-gold">{t('admin.adminLayout.fullAccess')}</span>}
          <AdminNotificationBell />
          <button
            type="button"
            onClick={toggleDense}
            title={dense ? t('admin.adminLayout.comfortMode') : t('admin.adminLayout.denseMode')}
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
