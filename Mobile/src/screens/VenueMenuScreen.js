import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Map, Camera, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Badge, Button, Card, Chip, EmptyState, Icon, IconButton, Input, Loading, Muted, Row, T } from '../components/UI';
import { AppearUp, AppearFade } from '../components/motion';
import { ReservationSheet } from '../components/ReservationSheet';
import { CustomizationSheet } from '../components/CustomizationSheet';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';
import { MAP_STYLE_URL } from '../mapStyle';

export default function VenueMenuScreen() {
  const { venueId, tableId } = useLocalSearchParams();
  const router = useRouter();
  const { t, n, money, isRTL } = useI18n();
  const cart = useCart();
  const toast = useToast();
  const [venue, setVenue] = useState(null);
  const [sections, setSections] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [flags, setFlags] = useState({ reservations: true });
  const [showReservation, setShowReservation] = useState(false);
  const [waiterCalling, setWaiterCalling] = useState(false);
  const [waiterCalledAt, setWaiterCalledAt] = useState(null);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [activeTab, setActiveTab] = useState('menu');
  const [reviewsData, setReviewsData] = useState(null);
  const [punchCardPlans, setPunchCardPlans] = useState([]);
  const listRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'info' && !reviewsData) {
      api
        .get(`/reviews/venue/${venueId}`)
        .then(({ data }) => setReviewsData(data))
        .catch(() => setReviewsData({ reviews: [], averageRating: 0, reviewCount: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    api
      .get(`/venues/${venueId}/punch-cards/public`)
      .then(({ data }) => setPunchCardPlans(data))
      .catch(() => setPunchCardPlans([]));
  }, [venueId]);

  async function buyPunchCard(planId) {
    try {
      await api.post(`/venues/${venueId}/punch-cards/${planId}/purchase`);
      toast.success(t('punchCardBought'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function callWaiter() {
    if (!tableId || waiterCalling) return;
    setWaiterCalling(true);
    try {
      await api.post('/waiter-calls', { venueId, tableId });
      setWaiterCalledAt(Date.now());
      toast.success(t('waiterCallSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('waiterCallError'));
    } finally {
      setWaiterCalling(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [{ data: v }, { data: cats }, { data: items }] = await Promise.all([
          api.get(`/venues/${venueId}`),
          api.get(`/menu/${venueId}/categories`),
          api.get(`/menu/${venueId}/items`),
        ]);
        setVenue(v);
        const byCategory = cats
          .filter((c) => !c.isHidden)
          .map((c) => ({ title: c.name, id: c.id, data: items.filter((i) => i.categoryId === c.id) }))
          .filter((s) => s.data.length > 0);
        const uncategorized = items.filter((i) => !cats.some((c) => c.id === i.categoryId));
        if (uncategorized.length) byCategory.push({ title: t('otherCategory'), id: 'other', data: uncategorized });
        setSections(byCategory);
        api
          .get(`/menu/${venueId}/recommendations`)
          .then(({ data }) => setRecommendations(data || []))
          .catch(() => {});
        api
          .get('/content/feature-flags')
          .then(({ data }) => setFlags(data))
          .catch(() => {});
      } catch {
        setSections([]);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  useEffect(() => {
    if (tableId) cart.setTableId(tableId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId]);

  const filteredSections = useMemo(() => {
    if (!sections) return [];
    if (!search) return sections;
    return sections
      .map((s) => ({ ...s, data: s.data.filter((i) => `${i.name} ${i.description || ''}`.includes(search)) }))
      .filter((s) => s.data.length > 0);
  }, [sections, search]);

  if (!venue || !sections) return <Loading />;

  function addToCart(item, modifierSelections = []) {
    const wasReset = cart.addItem(
      { id: venue.id, name: venue.name, acceptsPickup: !!venue.acceptsPickup },
      item,
      modifierSelections
    );
    if (wasReset) toast.info(t('cartReset', { venue: venue.name }));
  }

  function handleAddPress(item) {
    if (item.modifierGroups?.length > 0) {
      setCustomizingItem(item);
    } else {
      addToCart(item);
    }
  }

  const cover = imageUrl(venue.coverImageUrl || venue.logoUrl);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Stack.Screen options={{ title: venue.name }} />
      <SectionList
        ref={listRef}
        sections={activeTab === 'menu' ? filteredSections : []}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        contentContainerStyle={{ paddingBottom: cart.totals.count > 0 ? 130 : 60 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 10 }}>
            <View style={styles.hero}>
              {cover ? (
                <Image source={{ uri: cover }} style={styles.heroImg} resizeMode="cover" />
              ) : (
                <View style={[styles.heroImg, styles.heroFallback]}>
                  <Icon name="coffee" size={36} color={colors.gold300} />
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(13,12,10,0.55)', 'rgba(13,12,10,0.95)']}
                style={styles.heroScrim}
                pointerEvents="none"
              />

              {!!venue.averageRating && Number(venue.averageRating) > 0 && (
                <View style={[styles.heroPill, isRTL ? { left: 14 } : { right: 14 }]}>
                  <Icon name="star" size={12} color={colors.gold300} />
                  <T style={{ fontSize: 12, fontFamily: fonts.bold, color: colors.gold300 }}>
                    {Number(venue.averageRating).toFixed(1)}
                  </T>
                </View>
              )}

              <View
                style={[
                  styles.heroText,
                  { [isRTL ? 'paddingRight' : 'paddingLeft']: venue.logoUrl ? 76 : 0 },
                ]}
              >
                <T style={{ fontFamily: fonts.black, fontSize: 24, color: colors.ink, lineHeight: 30 }} numberOfLines={1}>
                  {venue.name}
                </T>
                <Row style={{ gap: 5, marginTop: 5 }}>
                  <Icon name="map-pin" size={12} color={colors.gold200} />
                  <Muted style={{ fontSize: 13, color: colors.gold100 }} numberOfLines={1}>
                    {venue.city}
                    {venue.address ? ` — ${venue.address}` : ''}
                  </Muted>
                </Row>
              </View>

              {!!venue.logoUrl && (
                <Image
                  source={{ uri: imageUrl(venue.logoUrl) }}
                  style={[styles.heroAvatar, isRTL ? { right: 16 } : { left: 16 }]}
                />
              )}
            </View>

            {!!venue.isTemporarilyClosed && (
              <View style={styles.closedBanner}>
                <Icon name="clock" size={15} color={colors.red} />
                <T style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.red, flex: 1 }}>
                  {t('closedNoOrder')}
                </T>
              </View>
            )}

            <Row style={{ paddingHorizontal: 16, gap: 8, marginTop: venue.logoUrl ? 30 : 14 }}>
              <Pressable style={{ flex: 1 }} onPress={() => setActiveTab('menu')}>
                <View style={[styles.tabBtn, activeTab === 'menu' && styles.tabBtnActive]}>
                  <Icon name="book-open" size={14} color={activeTab === 'menu' ? colors.charcoal : colors.ink} />
                  <T
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13,
                      color: activeTab === 'menu' ? colors.charcoal : colors.ink,
                    }}
                  >
                    {t('menuTab')}
                  </T>
                </View>
              </Pressable>
              <Pressable style={{ flex: 1 }} onPress={() => setActiveTab('info')}>
                <View style={[styles.tabBtn, activeTab === 'info' && styles.tabBtnActive]}>
                  <Icon name="info" size={14} color={activeTab === 'info' ? colors.charcoal : colors.ink} />
                  <T
                    style={{
                      fontFamily: fonts.bold,
                      fontSize: 13,
                      color: activeTab === 'info' ? colors.charcoal : colors.ink,
                    }}
                  >
                    {t('infoTab')}
                  </T>
                </View>
              </Pressable>
            </Row>

            {activeTab === 'info' && (
              <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
                {!!venue.phone && (
                  <Pressable onPress={() => Linking.openURL(`tel:${venue.phone}`)}>
                    <Row style={{ gap: 8, marginBottom: 14 }}>
                      <Icon name="phone" size={16} color={colors.gold300} />
                      <T style={{ fontSize: 14, fontFamily: fonts.medium }}>{venue.phone}</T>
                    </Row>
                  </Pressable>
                )}
                {!!venue.address && (
                  <Row style={{ gap: 8, marginBottom: 14, alignItems: 'flex-start' }}>
                    <Icon name="map-pin" size={16} color={colors.gold300} style={{ marginTop: 2 }} />
                    <T style={{ fontSize: 14, flex: 1 }}>{venue.address}</T>
                  </Row>
                )}
                {!!venue.lat && !!venue.lng && (
                  <View style={styles.infoMapWrap} pointerEvents="none">
                    <Map
                      style={StyleSheet.absoluteFill}
                      mapStyle={MAP_STYLE_URL}
                      dragPan={false}
                      touchZoom={false}
                      touchRotate={false}
                      touchPitch={false}
                      logo={false}
                      attribution={false}
                    >
                      <Camera
                        initialViewState={{ center: [Number(venue.lng), Number(venue.lat)], zoom: 15 }}
                      />
                      <ViewAnnotation lngLat={[Number(venue.lng), Number(venue.lat)]}>
                        <View style={styles.venuePin} />
                      </ViewAnnotation>
                    </Map>
                  </View>
                )}

                {punchCardPlans.length > 0 && (
                  <View style={{ marginTop: 22 }}>
                    <T style={{ fontFamily: fonts.black, fontSize: 16, marginBottom: 12 }}>{t('punchCardsTitle')}</T>
                    {punchCardPlans.map((plan) => (
                      <Card key={plan.id} style={{ marginBottom: 10 }}>
                        <Row between>
                          <View style={{ flex: 1 }}>
                            <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{plan.name}</T>
                            <Muted style={{ fontSize: 12, marginTop: 4 }}>
                              {plan.menuItemName} — {plan.totalCredits} {t('punchCardCredits')} — {money(plan.price)}
                            </Muted>
                          </View>
                          <Button small title={t('buy')} onPress={() => buyPunchCard(plan.id)} />
                        </Row>
                      </Card>
                    ))}
                  </View>
                )}

                <View style={{ marginTop: 22 }}>
                  <Row between style={{ marginBottom: 12 }}>
                    <T style={{ fontFamily: fonts.black, fontSize: 16 }}>{t('reviewsTab')}</T>
                    {!!reviewsData?.reviewCount && (
                      <Row style={{ gap: 4 }}>
                        <Icon name="star" size={13} color={colors.gold300} />
                        <T style={{ fontSize: 13, fontFamily: fonts.bold, color: colors.gold300 }}>
                          {Number(reviewsData.averageRating).toFixed(1)} ({n(reviewsData.reviewCount)})
                        </T>
                      </Row>
                    )}
                  </Row>
                  {!reviewsData && <Loading />}
                  {reviewsData && reviewsData.reviews.length === 0 && (
                    <EmptyState icon="message-circle" title={t('venueNoReviewsYet')} />
                  )}
                  {reviewsData?.reviews.map((rv) => (
                    <Card key={rv.id} style={{ marginBottom: 10 }}>
                      <Row between>
                        <T style={{ fontFamily: fonts.bold, fontSize: 13 }}>{rv.userName}</T>
                        <Row style={{ gap: 3 }}>
                          <Icon name="star" size={12} color={colors.gold300} />
                          <T style={{ fontSize: 12, fontFamily: fonts.bold }}>{rv.rating}</T>
                        </Row>
                      </Row>
                      {!!rv.comment && (
                        <Muted style={{ fontSize: 13, marginTop: 6 }}>{rv.comment}</Muted>
                      )}
                      {!!rv.venueReply && (
                        <View style={styles.replyBox}>
                          <T style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.gold300, marginBottom: 3 }}>
                            {t('venueReply')}
                          </T>
                          <Muted style={{ fontSize: 12 }}>{rv.venueReply}</Muted>
                        </View>
                      )}
                    </Card>
                  ))}
                </View>
              </View>
            )}

            {activeTab === 'menu' && (
            <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
              <Row style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {!!venue.acceptsPickup && <Badge icon="shopping-bag" label={t('pickupActive')} tone="green" />}
                {cart.tableId && <Badge icon="grid" label={t('tableOrder')} />}
              </Row>
              <Row style={{ gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                {!!flags.reservations && (
                  <Button
                    icon="calendar"
                    title={t('reserveTable')}
                    variant="ghost"
                    small
                    onPress={() => setShowReservation(true)}
                  />
                )}
                {!!tableId && (
                  <Button
                    icon="bell"
                    title={waiterCalledAt && Date.now() - waiterCalledAt < 60000 ? t('waiterCalled') : t('callWaiter')}
                    variant="ghost"
                    small
                    disabled={waiterCalling || (waiterCalledAt && Date.now() - waiterCalledAt < 60000)}
                    onPress={callWaiter}
                  />
                )}
              </Row>
              <View style={styles.searchWrap}>
                <Icon
                  name="search"
                  size={16}
                  color={colors.gold300}
                  style={[styles.searchIcon, isRTL ? { right: 14 } : { left: 14 }]}
                />
                <Input
                  placeholder={t('searchMenu')}
                  value={search}
                  onChangeText={setSearch}
                  style={[{ marginBottom: 12 }, isRTL ? { paddingRight: 38 } : { paddingLeft: 38 }]}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Row style={{ gap: 8 }}>
                  {sections.map((s, idx) => (
                    <Chip
                      key={s.id}
                      label={s.title}
                      active={activeCategory === s.id}
                      onPress={() => {
                        setActiveCategory(s.id);
                        listRef.current?.scrollToLocation({ sectionIndex: idx, itemIndex: 0, viewOffset: 60 });
                      }}
                    />
                  ))}
                </Row>
              </ScrollView>
              {recommendations.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <Row style={{ gap: 6, marginBottom: 10 }}>
                    <Icon name="zap" size={14} color={colors.gold300} />
                    <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('recommended')}</T>
                  </Row>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <Row style={{ gap: 10, alignItems: 'stretch' }}>
                      {recommendations.map((r) => {
                        const rImg = imageUrl(r.imageUrl);
                        return (
                          <Card key={r.id} gold style={{ width: 160, padding: 0, overflow: 'hidden' }}>
                            <View style={styles.recoImageWrap}>
                              {rImg ? (
                                <Image source={{ uri: rImg }} style={styles.recoImage} />
                              ) : (
                                <Icon name="coffee" size={22} color={colors.gold300} />
                              )}
                            </View>
                            <View style={{ padding: 12 }}>
                              <T style={{ fontFamily: fonts.medium, fontSize: 13 }} numberOfLines={1}>
                                {r.name}
                              </T>
                              <T style={{ color: colors.gold300, fontFamily: fonts.bold, fontSize: 13, marginVertical: 8 }}>
                                {money(r.price)}
                              </T>
                              <Button
                                small
                                icon="plus"
                                title={t('addBtn')}
                                onPress={() => handleAddPress(r)}
                                disabled={!!venue.isTemporarilyClosed}
                              />
                            </View>
                          </Card>
                        );
                      })}
                    </Row>
                  </ScrollView>
                </View>
              )}
            </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Row between style={styles.sectionHeader}>
            <T style={{ fontFamily: fonts.black, fontSize: 17, color: colors.gold300 }}>{section.title}</T>
            <Muted style={{ fontSize: 12 }}>{n(section.data.length)}</Muted>
          </Row>
        )}
        renderItem={({ item, index }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <AppearUp index={Math.min(index, 6)} delayStep={45}>
              <MenuItemRow
                item={item}
                quantity={cart.quantityOf(item.id)}
                disabled={!!venue.isTemporarilyClosed || !item.isAvailable}
                onAdd={() => handleAddPress(item)}
                onRemove={() => cart.decrementItem(item.id)}
              />
            </AppearUp>
          </View>
        )}
        ListEmptyComponent={<EmptyState icon="book-open" title={t('emptyMenu')} />}
        onScrollToIndexFailed={() => {}}
      />

      {cart.totals.count > 0 && (
        <AppearUp from={70} delayStep={0}>
          <Pressable style={styles.cartBar} onPress={() => router.push('/cart')}>
            <LinearGradient
              colors={[colors.gold200, colors.gold400]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Icon name="shopping-cart" size={17} color={colors.charcoal} />
            <T style={{ fontFamily: fonts.bold, color: colors.charcoal, fontSize: 15, textAlign: 'center' }}>
              {t('viewCart', { n: n(cart.totals.count) })} — {money(cart.totals.amount)}
            </T>
          </Pressable>
        </AppearUp>
      )}

      <ReservationSheet visible={showReservation} onClose={() => setShowReservation(false)} venueId={venueId} />
      <CustomizationSheet
        visible={!!customizingItem}
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
        onConfirm={(modifierSelections) => {
          addToCart(customizingItem, modifierSelections);
          setCustomizingItem(null);
        }}
      />
    </View>
  );
}

function MenuItemRow({ item, quantity, disabled, onAdd, onRemove }) {
  const { t, n, money } = useI18n();
  const img = imageUrl(item.imageUrl);
  const hasModifiers = item.modifierGroups?.length > 0;
  return (
    <Card style={{ marginBottom: 10, padding: 12, opacity: item.isAvailable ? 1 : 0.5 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        {img && <Image source={{ uri: img }} style={styles.itemImage} />}
        <View style={{ flex: 1 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 15, flex: 1 }}>{item.name}</T>
            {!item.isAvailable && <Badge label={t('unavailable')} tone="red" />}
          </Row>
          {item.description ? (
            <Muted style={{ marginTop: 4, fontSize: 13 }} numberOfLines={2}>
              {item.description}
            </Muted>
          ) : null}
          {hasModifiers && (
            <View style={{ marginTop: 6, alignSelf: 'flex-start' }}>
              <Badge label={t('customizable')} tone="gold" icon="sliders" />
            </View>
          )}
          <Row between style={{ marginTop: 12 }}>
            <T style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.gold300 }}>{money(item.price)}</T>
            {quantity === 0 || hasModifiers ? (
              <Button small icon="plus" title={t('addBtn')} onPress={onAdd} disabled={disabled} />
            ) : (
              <View style={styles.qtyPill}>
                <IconButton name="minus" size={13} onPress={onRemove} style={styles.qtyBtn} />
                <T style={{ fontFamily: fonts.black, textAlign: 'center', minWidth: 20, fontSize: 14 }}>{n(quantity)}</T>
                <IconButton name="plus" size={13} onPress={onAdd} disabled={disabled} style={styles.qtyBtn} />
              </View>
            )}
          </Row>
        </View>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%', height: 210, backgroundColor: colors.surfaceHigh },
  heroImg: { width: '100%', height: '100%' },
  heroFallback: { alignItems: 'center', justifyContent: 'center' },
  heroScrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '75%' },
  heroText: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  heroAvatar: {
    position: 'absolute',
    bottom: -20,
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 3,
    borderColor: colors.bg,
    backgroundColor: colors.surfaceHigh,
  },
  heroPill: {
    position: 'absolute',
    top: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(13,12,10,0.7)',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.redBg,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
  },
  tabBtnActive: { backgroundColor: colors.gold300 },
  infoMapWrap: {
    width: '100%',
    height: 150,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceHigh,
    marginBottom: 6,
  },
  venuePin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.gold300,
    borderWidth: 2,
    borderColor: colors.charcoal,
  },
  replyBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  searchWrap: { justifyContent: 'center' },
  searchIcon: { position: 'absolute', zIndex: 1 },
  sectionHeader: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 10,
  },
  itemImage: { width: 72, height: 72, borderRadius: radius.md, backgroundColor: colors.surfaceHigh },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  recoImageWrap: {
    width: '100%',
    height: 90,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recoImage: { width: '100%', height: '100%' },
  cartBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: colors.gold300,
    borderRadius: radius.full,
    overflow: 'hidden',
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  qtyBtn: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.surface },
});
