import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { PanelNavRow } from '../components/PanelUI';
import { T } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

const VENUE_NAV = [
  { icon: 'bar-chart-2', key: 'navDashboard', path: '/venue-panel/dashboard' },
  { icon: 'shopping-bag', key: 'navOrders', path: '/venue-panel/orders' },
  { icon: 'monitor', key: 'navKds', path: '/venue-panel/kds' },
  { icon: 'book-open', key: 'navMenuManagement', path: '/venue-panel/menu-management' },
  { icon: 'package', key: 'navCombos', path: '/venue-panel/combos' },
  { icon: 'tag', key: 'navModifierGroups', path: '/venue-panel/modifier-groups' },
  { icon: 'sliders', key: 'navVenueSettings', path: '/venue-panel/settings' },
  { icon: 'calendar', key: 'navReservations', path: '/venue-panel/reservations' },
  { icon: 'star', key: 'navFeedback', path: '/venue-panel/feedback' },
  { icon: 'clock', key: 'navShifts', path: '/venue-panel/shifts' },
  { icon: 'message-circle', key: 'navMarketing', path: '/venue-panel/marketing' },
  { icon: 'file-text', key: 'navTaxSettings', path: '/venue-panel/tax-settings' },
];

const ADMIN_NAV = [
  { icon: 'bar-chart-2', key: 'navAdminDashboard', path: '/admin-console/dashboard' },
  { icon: 'coffee', key: 'navVenues', path: '/admin-console/venues' },
  { icon: 'activity', key: 'navLiveOps', path: '/admin-console/live-ops' },
  { icon: 'shield', key: 'navFraud', path: '/admin-console/fraud' },
  { icon: 'life-buoy', key: 'navTickets', path: '/admin-console/tickets' },
  { icon: 'radio', key: 'navBroadcast', path: '/admin-console/broadcast', superAdminOnly: true },
];

export default function AdminPanelScreen() {
  const { t, isRTL } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isVenueRole = user?.role === 'VENUE_OWNER' || user?.role === 'VENUE_STAFF';
  const nav = isVenueRole ? VENUE_NAV : ADMIN_NAV;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 60 }}
    >
      <View style={{ marginBottom: 22 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.gold300, marginBottom: 6 }}>
          {isVenueRole ? t('venuePanelSubtitle') : t('adminPanelSubtitle')}
        </T>
        <T style={{ fontFamily: fonts.black, fontSize: 30, lineHeight: 40 }}>{t('adminPanel')}</T>
      </View>

      <View>
        {nav
          .filter((item) => !item.superAdminOnly || user?.role === 'SUPER_ADMIN')
          .map((item) => (
            <PanelNavRow
              key={item.path}
              icon={item.icon}
              title={t(item.key)}
              onPress={() => router.push(item.path)}
              isRTL={isRTL}
            />
          ))}
      </View>
    </ScrollView>
  );
}
