// Must be the very first import: react-native-screens' native-stack (and
// therefore every header back button it renders) is built on top of
// react-native-gesture-handler. Without GestureHandlerRootView wrapping the
// app, its press/touch responders silently misfire — the exact symptom of
// header back buttons rendering but doing nothing on tap.
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';
import { Platform, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  Vazirmatn_900Black,
} from '@expo-google-fonts/vazirmatn';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { LockScreen } from '../src/components/LockScreen';
import { usePushNotifications } from '../src/services/pushNotifications';
import { useDwellTracker } from '../src/services/dwellTracker';
import { CartProvider } from '../src/context/CartContext';
import { ToastProvider } from '../src/context/ToastContext';
import { installGlobalErrorHandlers } from '../src/services/globalErrorHandlers';
import { checkForOtaUpdate } from '../src/services/otaUpdates';
import { BatteryProvider } from '../src/context/BatteryContext';
import { LocationOverrideProvider } from '../src/context/LocationOverrideContext';
import { LanguageProvider, useI18n } from '../src/i18n';
import { Icon } from '../src/components/UI';
import { LowBatteryBanner } from '../src/components/LowBatteryBanner';
import { colors, fonts } from '../src/theme';

// The native-stack header's own auto-generated back link is unreliable on
// web in this app (verified: clicking it does nothing, while raw browser
// history.back() correctly pops the route) — some interaction between
// expo-router's web Link and the (tabs) anchor/NativeTabs combo. Replacing
// headerLeft with our own Pressable sidesteps it entirely and works
// identically on native, where the default back button is unaffected.
function HeaderBack() {
  const router = useRouter();
  const { isRTL } = useI18n();
  function goBack() {
    if (router.canGoBack()) router.back();
    else if (Platform.OS === 'web') window.history.back();
    else router.replace('/');
  }
  return (
    <Pressable onPress={goBack} hitSlop={12} style={{ paddingHorizontal: 4, paddingVertical: 4 }}>
      <Icon name={isRTL ? 'chevron-right' : 'chevron-left'} size={24} color={colors.ink} />
    </Pressable>
  );
}

SplashScreen.preventAutoHideAsync().catch(() => {});
installGlobalErrorHandlers();
checkForOtaUpdate();

// Crash/error monitoring — entirely optional, only active when a DSN is set,
// so local dev (Expo Go / dev client without .env) never sends anything.
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2,
  });
}

// Anchors the root stack to the tabs group so that deep-linking straight to
// a pushed screen (wallet, venue/[id], ...) still mounts (tabs) underneath
// it — otherwise there's nothing left in the stack to go "back" to.
export const unstable_settings = {
  anchor: '(tabs)',
};

// Mirrors the web's dark theme so expo-router's own chrome (default
// background behind screens, iOS 26 liquid-glass headers) never flashes
// white — see Expo Router's native-tabs "known problems" section.
const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surface,
    border: colors.border,
    text: colors.ink,
    primary: colors.gold300,
  },
};

function RootStack() {
  const { t } = useI18n();
  const { locked } = useAuth();
  usePushNotifications();
  useDwellTracker();

  if (locked) return <LockScreen />;
  const screenHeader = (title) => ({
    title,
    headerShown: true,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 16 },
    headerShadowVisible: false,
    headerLeft: () => <HeaderBack />,
    headerBackVisible: false,
  });

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="cart" options={screenHeader(t('cart'))} />
      <Stack.Screen name="venue/[venueId]" options={screenHeader(t('menuOf'))} />
      <Stack.Screen name="order/[orderId]" options={screenHeader(t('orderDetail'))} />
      <Stack.Screen name="login" options={{ ...screenHeader(t('login')), presentation: 'modal' }} />
      <Stack.Screen name="register" options={{ ...screenHeader(t('signUp')), presentation: 'modal' }} />
      <Stack.Screen name="wallet" options={screenHeader(t('wallet'))} />
      <Stack.Screen name="subscription" options={screenHeader(t('subscription'))} />
      <Stack.Screen name="referral" options={screenHeader(t('referral'))} />
      <Stack.Screen name="loyalty" options={screenHeader(t('loyalty'))} />
      <Stack.Screen name="favorites" options={screenHeader(t('favorites'))} />
      <Stack.Screen name="notifications" options={screenHeader(t('notifications'))} />
      <Stack.Screen name="reviews" options={screenHeader(t('myReviews'))} />
      <Stack.Screen name="support" options={screenHeader(t('support'))} />
      <Stack.Screen name="danger-zone" options={screenHeader(t('accountDangerZone'))} />
      <Stack.Screen name="sessions" options={screenHeader(t('sessionsAnd2fa'))} />
      <Stack.Screen name="register-venue" options={screenHeader(t('registerVenue'))} />
      <Stack.Screen name="venue-panel/dashboard" options={screenHeader(t('navDashboard'))} />
      <Stack.Screen name="venue-panel/orders" options={screenHeader(t('navOrders'))} />
      <Stack.Screen name="venue-panel/kds" options={screenHeader(t('navKds'))} />
      <Stack.Screen name="venue-panel/reservations" options={screenHeader(t('navReservations'))} />
      <Stack.Screen name="venue-panel/feedback" options={screenHeader(t('navFeedback'))} />
      <Stack.Screen name="venue-panel/shifts" options={screenHeader(t('navShifts'))} />
      <Stack.Screen name="admin-console/dashboard" options={screenHeader(t('navAdminDashboard'))} />
      <Stack.Screen name="admin-console/venues" options={screenHeader(t('navVenues'))} />
      <Stack.Screen name="admin-console/live-ops" options={screenHeader(t('navLiveOps'))} />
      <Stack.Screen name="admin-console/fraud" options={screenHeader(t('navFraud'))} />
      <Stack.Screen name="admin-console/tickets" options={screenHeader(t('navTickets'))} />
      <Stack.Screen name="admin-console/broadcast" options={screenHeader(t('navBroadcast'))} />
      <Stack.Screen name="profile" options={screenHeader(t('editProfile'))} />
      <Stack.Screen name="admin-panel" options={screenHeader(t('adminPanel'))} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
    Vazirmatn_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LanguageProvider>
          <BatteryProvider>
            <AuthProvider>
              <LocationOverrideProvider>
              <CartProvider>
                <ToastProvider>
                  <ThemeProvider value={navTheme}>
                    <StatusBar style="light" backgroundColor={colors.bg} />
                    <RootStack />
                    <LowBatteryBanner />
                  </ThemeProvider>
                </ToastProvider>
              </CartProvider>
              </LocationOverrideProvider>
            </AuthProvider>
          </BatteryProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
