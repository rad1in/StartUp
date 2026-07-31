import { Platform } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { Tabs } from 'expo-router';
import { useI18n } from '../../src/i18n';
import { colors } from '../../src/theme';
import GlassTabBar from '../../src/components/GlassTabBar';

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
// Order: Search, Scan, Home, Social, Account (5 tabs — Android's native
// BottomNavigationView hard-caps at 5, so Cart AND Orders were moved to
// pushed routes — Cart via the floating cart bar / cart icon, Orders via
// Account → "My orders" — to make room for Social as a persistent tab).
export default function TabsLayout() {
  const { t } = useI18n();

  // Android's native BottomNavigationView (via NativeTabs below) renders flat
  // here and its Material icon ligatures fail to load — swap in a hand-built
  // glass tab bar for Android only. iOS keeps the real native tab bar as-is.
  if (Platform.OS === 'android') {
    return (
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <GlassTabBar {...props} />}>
        <Tabs.Screen name="search" options={{ title: t('tabSearch') }} />
        <Tabs.Screen name="scan" options={{ title: t('tabScan') }} />
        <Tabs.Screen name="index" options={{ title: t('tabHome') }} />
        <Tabs.Screen name="social" options={{ title: t('tabSocial') }} />
        <Tabs.Screen name="account" options={{ title: t('tabAccount') }} />
      </Tabs>
    );
  }

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

      <NativeTabs.Trigger name="social">
        <Icon sf="square.grid.3x3" md="grid_view" />
        <Label>{t('tabSocial')}</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
        <Label>{t('tabAccount')}</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
