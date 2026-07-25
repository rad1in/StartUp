import { useCallback, useEffect, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api from '../api/client';
import { Button, EmptyState, Icon, Muted, Row, T } from '../components/UI';
import { VenueCard } from '../components/VenueCard';
import { LocationOverrideButton } from '../components/LocationOverrideButton';
import { AppearUp } from '../components/motion';
import { VenueListSkeleton } from '../components/Shimmer';
import { useCart } from '../context/CartContext';
import { useLocationOverride } from '../context/LocationOverrideContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 5) return 'greetingNight';
  if (hour < 12) return 'greetingMorning';
  if (hour < 18) return 'greetingAfternoon';
  return 'greetingEvening';
}

export default function HomeScreen() {
  const router = useRouter();
  const { t, n, lang, setLang } = useI18n();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { manualLocation } = useLocationOverride();

  // permission: null = not asked yet, 'granted' | 'denied'
  const [permission, setPermission] = useState(null);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [venues, setVenues] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadNearby = useCallback(async () => {
    try {
      let coords;
      if (manualLocation) {
        coords = manualLocation;
        setPermission('granted');
      } else {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          setPermission('unrequested');
          setVenues(null);
          return;
        }
        setPermission('granted');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      }
      const { data: settings } = await api.get('/content/settings/discovery').catch(() => ({ data: { radiusMeters: 100 } }));
      const radius = settings?.radiusMeters || 100;
      setRadiusMeters(radius);
      const { data } = await api.get('/venues/nearby', {
        params: { lat: coords.lat, lng: coords.lng, radius },
      });
      setVenues(data);
    } catch {
      setVenues([]);
    }
  }, [manualLocation]);

  useEffect(() => {
    loadNearby();
  }, [loadNearby]);

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      setVenues(null);
      loadNearby();
    } else {
      setPermission('denied');
    }
  }

  const header = (
    <View style={{ marginBottom: 22 }}>
      <View style={styles.glowOrbA} pointerEvents="none" />
      <View style={styles.glowOrbB} pointerEvents="none" />
      <Row between style={{ marginBottom: 28 }}>
        <View style={styles.logoMark}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImg} />
        </View>
        <Row style={{ gap: 8 }}>
          <LocationOverrideButton variant="icon" />
          <Pressable onPress={() => router.push('/cart')} style={styles.iconBtn}>
            <Icon name="shopping-cart" size={17} color={colors.ink} />
            {cart.totals.count > 0 && (
              <View style={styles.cartDot}>
                <T style={{ fontSize: 9, fontFamily: fonts.bold, color: colors.charcoal, textAlign: 'center' }}>
                  {n(cart.totals.count)}
                </T>
              </View>
            )}
          </Pressable>
          <Pressable onPress={() => setLang(lang === 'fa' ? 'en' : 'fa')} style={styles.iconBtn}>
            <T style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.ink }}>{lang === 'fa' ? 'EN' : 'فا'}</T>
          </Pressable>
        </Row>
      </Row>

      <T style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.gold300, marginBottom: 6 }}>
        {t(greetingKey())}
      </T>
      <T style={{ fontFamily: fonts.black, fontSize: 32, lineHeight: 42 }}>{t('nearbyTitle')}</T>
      <Muted style={{ marginTop: 8, fontSize: 15 }}>{t('nearbySubtitle', { radius: n(radiusMeters) })}</Muted>
    </View>
  );

  // Permission not yet requested, or explicitly denied — ask for it.
  if (permission === 'unrequested' || permission === 'denied') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        {header}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="map-pin"
            title={permission === 'denied' ? t('locationDenied') : t('locationNeeded')}
            subtitle={permission === 'denied' ? t('locationDeniedHint') : t('locationNeededHint')}
          />
          {permission === 'unrequested' && (
            <Button title={t('enableLocation')} onPress={requestLocation} style={{ marginHorizontal: 32 }} />
          )}
        </View>
      </View>
    );
  }

  if (venues === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
        <View style={{ paddingHorizontal: 16 }}>{header}</View>
        <VenueListSkeleton />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 8, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.gold300}
            onRefresh={async () => {
              setRefreshing(true);
              await loadNearby();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            {header}
            {venues.length > 0 && (
              <Row style={{ gap: 8, marginBottom: 4 }}>
                <View style={styles.liveDot} />
                <T style={{ fontFamily: fonts.bold, fontSize: 13, color: colors.gold300 }}>
                  {t('nearbyCount', { n: n(venues.length) })}
                </T>
              </Row>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="coffee" title={t('noNearbyCafes', { radius: n(radiusMeters) })} subtitle={t('noNearbyCafesHint')} />
        }
        renderItem={({ item, index }) => (
          <AppearUp index={Math.min(index, 8)}>
            <VenueCard venue={item} distanceMeters={item.distanceMeters} onPress={() => router.push(`/venue/${item.id}`)} />
          </AppearUp>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold300 },
  glowOrbA: {
    position: 'absolute',
    top: -60,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(229,196,118,0.05)',
  },
  glowOrbB: {
    position: 'absolute',
    top: 30,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(229,196,118,0.04)',
  },
});
