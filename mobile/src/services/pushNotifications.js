import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

// Foreground notifications must be shown explicitly — Expo's default handler
// suppresses the OS banner/sound while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Remote push is unavailable in Expo Go on Android from SDK 53 onward (only
// local notifications work there) — a dev/production build is required.
// iOS Expo Go and any dev build on either platform can still register.
async function getExpoPushToken() {
  if (!Device.isDevice) return null;
  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (status !== 'granted') {
    ({ status } = await Notifications.requestPermissionsAsync());
  }
  if (status !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token;
  } catch {
    // Expo Go on Android (SDK 53+) throws here — treat as "push unavailable".
    return null;
  }
}

// Registers/unregisters this device's Expo push token with the backend
// whenever the signed-in user changes, and routes the user to the right
// screen when they tap a notification (in background or from a cold start).
export function usePushNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const tokenRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return undefined;

    (async () => {
      const token = await getExpoPushToken();
      if (cancelled || !token) return;
      tokenRef.current = token;
      api
        .post('/push/expo-token', { token, deviceInfo: `${Platform.OS} ${Device.modelName || ''}`.trim() })
        .catch(() => {});
    })();

    return () => {
      cancelled = true;
      if (tokenRef.current) {
        api.delete('/push/expo-token', { data: { token: tokenRef.current } }).catch(() => {});
        tokenRef.current = null;
      }
    };
  }, [user]);

  useEffect(() => {
    function navigateFromNotification(response) {
      const url = response?.notification?.request?.content?.data?.url;
      if (url) router.push(url);
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateFromNotification(response);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(navigateFromNotification);
    return () => sub.remove();
  }, [router]);
}
