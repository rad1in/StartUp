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
import { useLanguage } from '../../context/LanguageContext';
import BranchSwitcher, { setActiveBranch } from '../../components/BranchSwitcher';
import PanelNav from '../../components/PanelNav';
import Loader from '../../components/Loader';
import ThemeToggle from '../../components/ThemeToggle';

// Tabs clustered by task so owners scan 3 short rows instead of one wall of 14.
function buildGroups(t) {
  return [
    {
      title: t('venue.layout.groupDaily'),
      tabs: [
        { to: '/venue', label: t('venue.layout.tabDashboard'), icon: LayoutDashboard, end: true, permission: null },
        { to: '/venue/orders', label: t('venue.layout.tabOrders'), icon: ClipboardList, permission: 'orders.view' },
        { to: '/venue/kds', label: t('venue.layout.tabKds'), icon: ChefHat, permission: 'orders.manage' },
        { to: '/venue/tables', label: t('venue.layout.tabTables'), icon: Armchair, permission: 'tables.view' },
        { to: '/venue/reservations', label: t('venue.layout.tabReservations'), icon: CalendarClock, permission: 'orders.view' },
      ],
    },
    {
      title: t('venue.layout.groupMenu'),
      tabs: [
        { to: '/venue/menu', label: t('venue.layout.tabMenuManagement'), icon: BookOpen, permission: 'menu.manage' },
        { to: '/venue/modifier-groups', label: t('venue.layout.tabModifierGroups'), icon: SlidersHorizontal, permission: 'menu.manage' },
        { to: '/venue/pairing-rules', label: t('venue.layout.tabPairingRules'), icon: Sparkles, permission: 'menu.manage' },
      ],
    },
    {
      title: t('venue.layout.groupBusiness'),
      tabs: [
        { to: '/venue/accounting', label: t('venue.layout.tabAccounting'), icon: Calculator, permission: 'accounting.view' },
        { to: '/venue/staff', label: t('venue.layout.tabStaff'), icon: Users, permission: 'staff.manage' },
        { to: '/venue/shifts', label: t('venue.layout.tabShifts'), icon: Clock, permission: null },
        { to: '/venue/feedback', label: t('venue.layout.tabFeedback'), icon: MessageSquare, permission: 'feedback.manage' },
        { to: '/venue/marketing', label: t('venue.layout.tabMarketing'), icon: Megaphone, permission: 'marketing.manage' },
        { to: '/venue/crm', label: t('venue.layout.tabCrm'), icon: Crown, permission: 'marketing.manage' },
        { to: '/venue/forecasting', label: t('venue.layout.tabForecasting'), icon: TrendingUp, permission: null, ownerOnly: true },
        { to: '/venue/inventory', label: t('venue.layout.tabInventory'), icon: Package, permission: null, ownerOnly: true },
        { to: '/venue/branches', label: t('venue.layout.tabBranches'), icon: GitBranch, permission: null, ownerOnly: true },
        { to: '/venue/settings', label: t('venue.layout.tabSettings'), icon: Settings, permission: 'settings.manage' },
      ],
    },
  ];
}

export default function VenueLayout() {
  const { has, loading } = useVenuePermissions();
  const { user } = useAuth();
  const { t } = useLanguage();
  const groups = buildGroups(t);

  if (loading) {
    return <Loader text={t('venue.layout.loadingPanel')} />;
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
        <h1 className="text-xl font-black text-ink">{t('venue.layout.panelTitle')}</h1>
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
