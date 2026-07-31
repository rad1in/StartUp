import { useCallback, useMemo, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Badge, Button, Card, EmptyState, Icon, Input, Muted, Row, T, Title } from '../components/UI';
import { PressableScale, AppearUp } from '../components/motion';
import { RowsSkeleton } from '../components/Shimmer';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

const STATUS_TONE = { PENDING: 'gold', PREPARING: 'gold', READY: 'green', SERVED: 'green', CANCELLED: 'red' };
const STATUS_ICON = {
  PENDING: 'clock',
  PREPARING: 'coffee',
  READY: 'check-circle',
  SERVED: 'check-circle',
  CANCELLED: 'x-circle',
};
const PROGRESS_STAGES = ['PENDING', 'PREPARING', 'READY', 'SERVED'];
const ACTIVE_STATUSES = ['PENDING', 'PREPARING', 'READY'];

export default function OrdersScreen() {
  const router = useRouter();
  const { t, money, date } = useI18n();
  const { user } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [orders, setOrders] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set());
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await api.get('/orders/mine');
      setOrders(data);
    } catch {
      setOrders([]);
    }
    try {
      const { data: reviews } = await api.get('/reviews/mine');
      setReviewedOrderIds(new Set((reviews || []).map((r) => r.orderId)));
    } catch {
      /* ignore — worst case the button stays available */
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openReviewModal(order) {
    setReviewOrder(order);
    setReviewRating(5);
    setReviewComment('');
  }

  async function submitReview() {
    if (!reviewOrder) return;
    setReviewSubmitting(true);
    try {
      await api.post('/reviews', {
        orderId: reviewOrder.id,
        venueId: reviewOrder.venueId,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      setReviewedOrderIds((prev) => new Set(prev).add(reviewOrder.id));
      setReviewOrder(null);
      toast.success(t('reviewSaved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setReviewSubmitting(false);
    }
  }

  const sections = useMemo(() => {
    if (!orders) return [];
    const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const past = orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
    const out = [];
    if (active.length) out.push({ title: t('activeOrdersSection'), data: active });
    if (past.length) out.push({ title: t('pastOrdersSection'), data: past });
    return out;
  }, [orders, t]);

  async function reorder(order) {
    try {
      const { data } = await api.post(`/orders/${order.id}/reorder`);
      cart.clearCart();
      const venue = { id: data.venueId, name: order.venue?.name || '', acceptsPickup: true };
      (data.items || []).forEach((item) => {
        for (let i = 0; i < (item.quantity || 1); i += 1) {
          cart.addItem(venue, { id: item.menuItemId, name: item.name, price: item.price });
        }
      });
      toast.success(t('reorderDone'));
      router.push('/cart');
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState icon="lock" title={t('signInToSeeOrders')} />
        <Button title={t('signIn')} onPress={() => router.push('/login')} style={{ marginHorizontal: 32 }} />
      </View>
    );
  }

  if (!orders) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
        <RowsSkeleton count={6} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(o) => o.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={colors.gold300}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        ListHeaderComponent={<Title style={{ marginBottom: 18 }}>{t('myOrders')}</Title>}
        ListEmptyComponent={<EmptyState icon="file-text" title={t('noOrders')} subtitle={t('noOrdersHint')} />}
        renderSectionHeader={({ section }) => (
          <T style={{ fontFamily: fonts.black, fontSize: 14, color: colors.gold300, marginBottom: 12, marginTop: 4 }}>
            {section.title}
          </T>
        )}
        renderItem={({ item, index }) => (
          <AppearUp index={Math.min(index, 8)}>
            <OrderRow
              order={item}
              onPress={() => router.push(`/order/${item.id}`)}
              onReorder={() => reorder(item)}
              reviewed={reviewedOrderIds.has(item.id)}
              onReview={() => openReviewModal(item)}
            />
          </AppearUp>
        )}
      />

      <Modal visible={!!reviewOrder} transparent animationType="fade" onRequestClose={() => setReviewOrder(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <T style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>{t('submitReview')}</T>
            <Row style={{ gap: 6, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={6}>
                  <Icon name="star" size={26} color={n <= reviewRating ? colors.gold300 : colors.border} />
                </Pressable>
              ))}
            </Row>
            <Input
              placeholder={t('reviewCommentPlaceholder')}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
            <Row style={{ gap: 8, marginTop: 14 }}>
              <Button
                title={t('cancel')}
                variant="ghost"
                onPress={() => setReviewOrder(null)}
                style={{ flex: 1 }}
              />
              <Button
                title={reviewSubmitting ? t('sending') : t('submitReview')}
                onPress={submitReview}
                disabled={reviewSubmitting}
                style={{ flex: 1 }}
              />
            </Row>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function OrderRow({ order, onPress, onReorder, reviewed, onReview }) {
  const { t, n, money, date } = useI18n();
  const venue = order.venue || {};
  const cover = imageUrl(venue.logoUrl || venue.coverImageUrl);
  const itemCount = (order.items || []).reduce((sum, i) => sum + (i.quantity || 1), 0);
  const tone = STATUS_TONE[order.status] || 'muted';
  const toneColor = tone === 'green' ? colors.green : tone === 'red' ? colors.red : colors.gold300;
  const stageIndex = PROGRESS_STAGES.indexOf(order.status);
  const isCancelled = order.status === 'CANCELLED';

  return (
    <PressableScale onPress={onPress} style={{ marginBottom: 12, opacity: isCancelled ? 0.6 : 1 }}>
      <Card>
        <Row style={{ gap: 12 }}>
          <View style={styles.thumb}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.thumbImg} />
            ) : (
              <Icon name="coffee" size={22} color={colors.gold300} />
            )}
            <View style={[styles.statusDot, { backgroundColor: toneColor }]}>
              <Icon name={STATUS_ICON[order.status] || 'clock'} size={10} color={colors.charcoal} />
            </View>
          </View>

          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: fonts.bold, fontSize: 16 }} numberOfLines={1}>
              {venue.name || order.venueName || '—'}
            </T>
            <Muted style={{ fontSize: 12, marginTop: 3 }}>
              {n(itemCount)} {t('items')} · {date(order.createdAt)}
            </Muted>
          </View>

          <T style={{ fontFamily: fonts.black, fontSize: 16, color: colors.gold300 }}>{money(order.totalAmount)}</T>
        </Row>

        {stageIndex >= 0 && stageIndex < PROGRESS_STAGES.length - 1 && (
          <Row style={{ gap: 4, marginTop: 14 }}>
            {PROGRESS_STAGES.slice(0, -1).map((stage, i) => (
              <View key={stage} style={[styles.progressBar, i <= stageIndex && { backgroundColor: colors.gold300 }]} />
            ))}
          </Row>
        )}

        <Row between style={{ marginTop: 14 }}>
          <Row style={{ gap: 6 }}>
            <Badge label={t(`st${order.status}`)} tone={tone} />
            <Badge
              label={t(`py${order.paymentStatus}`)}
              tone={order.paymentStatus === 'SUCCESS' ? 'green' : order.paymentStatus === 'FAILED' ? 'red' : 'muted'}
            />
          </Row>
          {order.status === 'SERVED' && (
            <Row style={{ gap: 6 }}>
              {!reviewed && <Button small variant="ghost" icon="star" title={t('submitReview')} onPress={onReview} />}
              <Button small variant="ghost" icon="rotate-ccw" title={t('reorder')} onPress={onReorder} />
            </Row>
          )}
        </Row>
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  thumbImg: { width: '100%', height: '100%', borderRadius: radius.md },
  statusDot: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceHigh,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
  },
});
