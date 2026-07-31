import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBattery } from '../context/BatteryContext';
import { useI18n } from '../i18n';

const CHECK_INTERVAL_MS = 60 * 1000;
const DWELL_THRESHOLD_MS = 5 * 60 * 1000;
const AT_VENUE_RADIUS_METERS = 60;

// Foreground-only presence check (no background-location task — unreliable
// in Expo Go and unnecessary for this feature). Every minute while the app
// is active, ask which venue (if any) the user is standing right next to; if
// it's the same venue for 5 continuous minutes, fire one local notification.
export function useDwellTracker() {
  const { user } = useAuth();
  const { isLowBattery } = useBattery();
  const { t, lang } = useI18n();
  const dwellRef = useRef(null); // { venueId, venueName, since, notified }

  useEffect(() => {
    if (!user || isLowBattery) return undefined;
    let cancelled = false;

    async function tick() {
      if (AppState.currentState !== 'active') return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const { data } = await api.get('/venues/nearby', {
          params: { lat: pos.coords.latitude, lng: pos.coords.longitude, radius: AT_VENUE_RADIUS_METERS },
        });
        if (cancelled) return;
        const nearest = data && data.length > 0 ? data[0] : null;

        if (!nearest) {
          dwellRef.current = null;
          return;
        }
        const prev = dwellRef.current;
        if (!prev || prev.venueId !== nearest.id) {
          dwellRef.current = { venueId: nearest.id, venueName: nearest.name, since: Date.now(), notified: false };
          return;
        }
        if (!prev.notified && Date.now() - prev.since >= DWELL_THRESHOLD_MS) {
          dwellRef.current = { ...prev, notified: true };
          await Notifications.scheduleNotificationAsync({
            content: {
              title: t('dwellNotifTitle', { venue: nearest.name }),
              body: t('dwellNotifBody', { venue: nearest.name }),
              data: { url: `/venue/${nearest.id}` },
            },
            trigger: null,
          });
        }
      } catch {
        // Best-effort: a failed location/venue lookup just skips this tick.
      }
    }

    tick();
    const id = setInterval(tick, CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user, isLowBattery, t, lang]);
}
