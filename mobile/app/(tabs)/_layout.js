import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { useI18n } from '../../src/i18n';
import { colors } from '../../src/theme';

// Anchors this group to "index" (Home) so that pushing a screen from OUTSIDE
// the tabs (wallet, cart, venue/[id], ...) — or deep-linking straight to one —
// keeps the tab navigator mounted underneath instead of wiping it, which is
// what was breaking the back button one level deep in Account. See Expo
// Router's modals doc, "Handle deep-linked modals".
export const unstable_settings = {
  anchor: 'index',
};

// Real system tab bar (UITabBarController on iOS — Liquid Glass on iOS 26+
// when built with Xcode 26, BottomNavigationView on Android). Falls back to
// expo-router's own basic web tab bar automatically on web.
//
// Order: Search, Scan, Home, Orders, Account (5 tabs — Android's native
// BottomNavigationView hard-caps at 5, so Cart was moved to a pushed route
// reached via the floating cart bar / cart icon instead of a persistent tab).
export default function TabsLayout() {
  const { t } = useI18n();

  return (
    <NativeTabs tintColor={colors.gold300} labelStyle={{ color: colors.inkMuted }}>
      <NativeTabs.Trigger name="search">
        <Icon sf="magnifyingglass" md="search" />
        <Label>{t('tabSearch')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="scan">
        <Icon sf="qrcode.viewfinder" md="qr_code_scanner" />
        <Label>{t('tabScan')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home_filled' }} />
        <Label>{t('tabHome')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="orders">
        <Icon sf="receipt" md="receipt_long" />
        <Label>{t('tabOrders')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <Label>{t('tabAccount')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
