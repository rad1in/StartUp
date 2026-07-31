import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Map, Camera, ViewAnnotation, UserLocation } from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import api, { imageUrl } from '../api/client';
import { Badge, Card, Chip, EmptyState, Icon, Input, Row, T, Muted } from '../components/UI';
import { AppearUp, PressableScale } from '../components/motion';
import { VenueListSkeleton } from '../components/Shimmer';
import { useCart } from '../context/CartContext';
import { useLocationOverride } from '../context/LocationOverrideContext';
import { LocationOverrideButton } from '../components/LocationOverrideButton';
import { useI18n } from '../i18n';
import { MAP_STYLE_URL } from '../mapStyle';
import { colors, fonts, radius } from '../theme';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Rough clearance for the native tab bar (Expo's NativeTabs draws its own
// chrome outside JS layout, so this can't be measured — it just needs to be
// tall enough that the sheet's readable peek content never slides under it).
const TAB_BAR_CLEARANCE = Platform.OS === 'ios' ? 78 : 64;
const SHEET_MAX = Math.round(SCREEN_HEIGHT * 0.74);
// The sheet itself always stays flush with the true screen bottom (no gap,
// no matter how far it's dragged) — only the collapsed peek's readable
// content is pushed up by TAB_BAR_CLEARANCE so it clears the tab bar; the
// extra sliver of sheet background below it simply sits behind the tab bar.
const SHEET_MIN = 178 + TAB_BAR_CLEARANCE;
const TEHRAN = { lat: 35.6892, lng: 51.389 };

function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export default function SearchScreen() {
  const router = useRouter();
  const { t, n, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const cameraRef = useRef(null);

  const [venues, setVenues] = useState(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState(null);
  const [gpsLocation, setGpsLocation] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const { manualLocation } = useLocationOverride();
  const userLocation = manualLocation || gpsLocation;

  useEffect(() => {
    api
      .get('/venues')
      .then(({ data }) => setVenues(data))
      .catch(() => setVenues([]));
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      } catch {
        /* map still works without a user location dot */
      }
    })();
  }, []);

  const cities = useMemo(() => {
    if (!venues) return [];
    return [...new Set(venues.map((v) => v.city).filter(Boolean))];
  }, [venues]);

  const filtered = useMemo(() => {
    if (!venues) return [];
    const list = venues.filter((v) => {
      if (city && v.city !== city) return false;
      if (search && !`${v.name} ${v.neighborhood || ''}`.includes(search)) return false;
      return v.lat != null && v.lng != null;
    });
    // Featured (paid/contractual placement) venues surface first, ranked by
    // distance among themselves; everyone else follows, also by distance —
    // never a hard override of proximity, just a boost within their group.
    return [...list].sort((a, b) => {
      if (!!a.isFeatured !== !!b.isFeatured) return a.isFeatured ? -1 : 1;
      const da = userLocation ? distanceMeters(userLocation.lat, userLocation.lng, Number(a.lat), Number(a.lng)) : 0;
      const db = userLocation ? distanceMeters(userLocation.lat, userLocation.lng, Number(b.lat), Number(b.lng)) : 0;
      return da - db;
    });
  }, [venues, search, city, userLocation]);

  // Re-fit the map to whatever the current filter shows, so pins always match the list.
  useEffect(() => {
    if (!cameraRef.current || filtered.length === 0) return;
    const lats = filtered.map((v) => Number(v.lat));
    const lngs = filtered.map((v) => Number(v.lng));
    const padding = { top: 80, right: 60, bottom: SHEET_MIN + 40, left: 60 };
    if (filtered.length === 1) {
      cameraRef.current.easeTo({ center: [lngs[0], lats[0]], zoom: 14, padding, duration: 500 });
    } else {
      cameraRef.current.fitBounds(
        [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
        { padding, duration: 500 }
      );
    }
  }, [filtered]);

  const collapsedTranslateY = SHEET_MAX - SHEET_MIN;
  const translateY = useRef(new Animated.Value(collapsedTranslateY)).current;
  const baseValue = useRef(collapsedTranslateY);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        translateY.setValue(clamp(baseValue.current + g.dy, 0, collapsedTranslateY));
      },
      onPanResponderRelease: (_, g) => {
        const next = clamp(baseValue.current + g.dy, 0, collapsedTranslateY);
        const shouldExpand = g.vy < -0.5 || (g.vy <= 0.5 && next < collapsedTranslateY / 2);
        const target = shouldExpand ? 0 : collapsedTranslateY;
        baseValue.current = target;
        setExpanded(target === 0);
        Animated.spring(translateY, { toValue: target, useNativeDriver: true, friction: 10, tension: 80 }).start();
      },
    })
  ).current;

  function toggleSheet() {
    const target = expanded ? collapsedTranslateY : 0;
    baseValue.current = target;
    setExpanded(!expanded);
    Animated.spring(translateY, { toValue: target, useNativeDriver: true, friction: 10, tension: 80 }).start();
  }

  const openVenue = useCallback(
    (venue) => {
      if (userLocation && venue.lat != null && venue.lng != null) {
        const d = distanceMeters(userLocation.lat, userLocation.lng, Number(venue.lat), Number(venue.lng));
        if (d > 500) {
          Alert.alert(t('farConfirmTitle'), t('farConfirmMessage', { distance: n(Math.round(d)) }), [
            { text: t('cancel'), style: 'cancel' },
            { text: t('continueAnyway'), onPress: () => router.push(`/venue/${venue.id}`) },
          ]);
          return;
        }
      }
      router.push(`/venue/${venue.id}`);
    },
    [userLocation, t, n, router]
  );

  if (!venues) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 8 }}>
        <VenueListSkeleton />
      </View>
    );
  }

  const initialCamera = userLocation
    ? { center: [userLocation.lng, userLocation.lat], zoom: 13 }
    : { center: [TEHRAN.lng, TEHRAN.lat], zoom: 11 };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Map style={{ flex: 1 }} mapStyle={MAP_STYLE_URL}>
        <Camera ref={cameraRef} initialViewState={initialCamera} />
        {!!gpsLocation && !manualLocation && <UserLocation />}
        {!!manualLocation && (
          <ViewAnnotation lngLat={[manualLocation.lng, manualLocation.lat]}>
            <View style={styles.manualPin} />
          </ViewAnnotation>
        )}
        {filtered.map((v) => (
          <ViewAnnotation key={v.id} lngLat={[Number(v.lng), Number(v.lat)]} onPress={() => openVenue(v)}>
            <View style={styles.pinBubble}>
              <Icon name="coffee" size={14} color={colors.charcoal} />
              {!!v.isFeatured && (
                <View style={styles.pinStarBadge}>
                  <Icon name="star" size={9} color={colors.gold300} />
                </View>
              )}
            </View>
          </ViewAnnotation>
        ))}
      </Map>

      {/* Cart quick-access floats above the sheet regardless of its position. */}
      <PressableScale onPress={() => router.push('/cart')} style={[styles.cartFab, { top: insets.top + 12 }]}>
        <Icon name="shopping-cart" size={18} color={colors.gold300} />
        {cart.totals.count > 0 && (
          <View style={styles.cartDot}>
            <T style={{ fontSize: 9, fontFamily: fonts.bold, color: colors.charcoal, textAlign: 'center' }}>
              {n(cart.totals.count)}
            </T>
          </View>
        )}
      </PressableScale>

      <LocationOverrideButton variant="icon" style={[styles.cartFab, { bottom: SHEET_MIN + 16 }]} />

      <Animated.View
        style={[
          styles.sheet,
          {
            height: SHEET_MAX,
            paddingBottom: insets.bottom,
            transform: [{ translateY }],
          },
        ]}
      >
        <View {...panResponder.panHandlers}>
          <Pressable onPress={toggleSheet} style={styles.handleArea}>
            <View style={styles.handle} />
          </Pressable>

          <View style={{ paddingHorizontal: 16, paddingBottom: expanded ? 0 : TAB_BAR_CLEARANCE }}>
            <View style={styles.searchBoxWrap}>
              <Icon
                name="search"
                size={16}
                color={colors.gold300}
                style={[styles.searchIcon, isRTL ? { right: 14 } : { left: 14 }]}
              />
              <Input
                placeholder={t('searchCafes')}
                value={search}
                onChangeText={setSearch}
                style={isRTL ? { paddingRight: 38 } : { paddingLeft: 38 }}
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <Row style={{ gap: 8 }}>
                <Chip icon="globe" label={t('allCities')} active={!city} onPress={() => setCity(null)} />
                {cities.map((c) => (
                  <Chip key={c} icon="map-pin" label={c} active={city === c} onPress={() => setCity(c)} />
                ))}
              </Row>
            </ScrollView>
            <Row between style={{ marginTop: 14, marginBottom: 4 }}>
              <T style={{ fontFamily: fonts.black, fontSize: 16, lineHeight: 21 }}>
                {t('nearbyCount', { n: n(filtered.length) })}
              </T>
              <Icon name={expanded ? 'chevron-down' : 'chevron-up'} size={16} color={colors.inkFaint} />
            </Row>
          </View>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(v) => v.id}
          scrollEnabled={expanded}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
          ListEmptyComponent={<EmptyState icon="coffee" title={t('noCafes')} subtitle={t('noCafesHint')} />}
          renderItem={({ item, index }) => (
            <AppearUp index={Math.min(index, 6)} delayStep={30}>
              <SearchVenueRow venue={item} userLocation={userLocation} onPress={() => openVenue(item)} />
            </AppearUp>
          )}
        />
      </Animated.View>
    </View>
  );
}

function SearchVenueRow({ venue, userLocation, onPress }) {
  const { t, n, isRTL } = useI18n();
  const cover = imageUrl(venue.coverImageUrl || venue.logoUrl);
  const distance =
    userLocation && venue.lat != null && venue.lng != null
      ? distanceMeters(userLocation.lat, userLocation.lng, Number(venue.lat), Number(venue.lng))
      : null;

  return (
    <PressableScale onPress={onPress} style={{ marginBottom: 10 }}>
      <Card style={{ padding: 10 }}>
        <Row style={{ gap: 12 }}>
          <View style={styles.rowImage}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.rowImagePhoto} />
            ) : (
              <Icon name="coffee" size={22} color={colors.gold300} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Row between>
              <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>
                {venue.name}
              </T>
              {!!venue.averageRating && (
                <Row style={{ gap: 3 }}>
                  <Icon name="star" size={11} color={colors.gold300} />
                  <T style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.gold300 }}>
                    {Number(venue.averageRating).toFixed(1)}
                  </T>
                </Row>
              )}
            </Row>
            <Muted style={{ fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {venue.city}
              {venue.neighborhood ? ` — ${venue.neighborhood}` : ''}
            </Muted>
            <Row style={{ marginTop: 7, gap: 6, flexWrap: 'wrap' }}>
              {distance != null && (
                <Badge icon="navigation" label={`${n(Math.round(distance))} ${isRTL ? 'متر' : 'm'}`} tone="gold" />
              )}
              {!!venue.isFeatured && <Badge icon="star" label={t('featuredVenue')} tone="gold" />}
              {!!venue.isTemporarilyClosed && <Badge icon="clock" label={t('temporarilyClosed')} tone="red" />}
              {!!venue.acceptsPickup && <Badge icon="shopping-bag" label={t('pickup')} tone="green" />}
            </Row>
          </View>
          <Icon name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={colors.inkFaint} />
        </Row>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handleArea: { alignItems: 'center', paddingVertical: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.inkFaint },
  cartFab: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
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
  manualPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold300,
    borderWidth: 2.5,
    borderColor: colors.charcoal,
  },
  searchBoxWrap: { justifyContent: 'center' },
  searchIcon: { position: 'absolute', zIndex: 1 },
  rowImage: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowImagePhoto: { width: '100%', height: '100%' },
  pinBubble: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.gold300,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pinStarBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold300,
  },
});
