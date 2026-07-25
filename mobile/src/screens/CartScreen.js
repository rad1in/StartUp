import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import api from '../api/client';
import { Button, Card, Chip, EmptyState, Icon, IconButton, Input, Muted, Row, T, Title } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

export default function CartScreen() {
  const router = useRouter();
  const { t, n, money, isRTL } = useI18n();
  const cart = useCart();
  const { user } = useAuth();
  const toast = useToast();
  const [couponCode, setCouponCode] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableInput, setTableInput] = useState('');
  const [tableError, setTableError] = useState('');
  const [tableResolving, setTableResolving] = useState(false);
  const [myPunchCards, setMyPunchCards] = useState([]);
  const [selectedPunchCardId, setSelectedPunchCardId] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  useEffect(() => {
    if (!cart.venue?.id) return;
    api
      .get(`/venues/${cart.venue.id}/punch-cards/mine`)
      .then(({ data }) => setMyPunchCards(data))
      .catch(() => setMyPunchCards([]));
  }, [cart.venue?.id]);

  useEffect(() => {
    api
      .get('/payments/methods')
      .then(({ data }) => {
        setPaymentMethods(data);
        setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
      })
      .catch(() => {});
  }, []);

  const usablePunchCards = myPunchCards.filter((c) => cart.items.some((i) => i.menuItemId === c.menuItemId));

  if (!cart.venue || cart.items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <EmptyState icon="shopping-cart" title={t('cartEmpty')} subtitle={t('cartEmptyHint')} />
        <Button
          title={t('browseCafes')}
          onPress={() => router.push('/')}
          style={{ marginHorizontal: 32 }}
        />
      </View>
    );
  }

  // Mirrors the web checkout flow: if the customer didn't scan a table QR
  // (no tableId known) and isn't going pickup, we must ask which table
  // they're at before placing the order — otherwise the order has nowhere
  // to be delivered.
  function requestCheckout() {
    if (!user) {
      toast.info(t('loginFirst'));
      router.push('/login');
      return;
    }
    if (!isPickup && !cart.tableId) {
      setTableInput('');
      setTableError('');
      setShowTableModal(true);
      return;
    }
    submitOrder();
  }

  async function resolveTableAndSubmit() {
    const num = tableInput.trim();
    if (!num) {
      setTableError(t('tableNumberRequired'));
      return;
    }
    setTableResolving(true);
    setTableError('');
    try {
      const { data } = await api.get(`/venues/${cart.venue.id}/tables/by-number/${encodeURIComponent(num)}`);
      setShowTableModal(false);
      await submitOrder(data.tableId);
    } catch (err) {
      setTableError(err.response?.status === 404 ? t('tableNumberNotFound', { number: num }) : t('tableNumberError'));
    } finally {
      setTableResolving(false);
    }
  }

  async function submitOrder(resolvedTableId, pickupOverride) {
    setSubmitting(true);
    try {
      const { data: order } = await api.post('/orders', {
        venueId: cart.venue.id,
        tableId: resolvedTableId || cart.tableId || undefined,
        items: cart.items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
          modifierSelections: i.modifierSelections || [],
        })),
        couponCode: couponCode || undefined,
        punchCardId: selectedPunchCardId || undefined,
        isPickup: pickupOverride ?? isPickup,
      });

      const { data: checkout } = await api.post('/payments/checkout', {
        orderId: order.id,
        walletAmount: Number(walletAmount) || 0,
        provider: selectedProvider || undefined,
      });

      if (checkout.redirectUrl) {
        // Real gateway (not the mock/wallet-only path) — open the bank's own
        // payment page in an in-app browser and wait for it to close, then
        // re-verify with our backend (the single source of truth), since the
        // gateway's callback lands on a web page, not directly back in the app.
        await WebBrowser.openBrowserAsync(checkout.redirectUrl);
        try {
          await api.get(`/payments/verify/${checkout.payment.providerRef}`);
        } catch {
          /* surfaced on the order screen */
        }
      }

      cart.clearCart();
      toast.success(t('orderSuccess'));
      router.replace(`/order/${order.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function pickupInstead() {
    setShowTableModal(false);
    setIsPickup(true);
    submitOrder(undefined, true);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Row style={{ gap: 12, marginBottom: 22 }}>
        <View style={styles.venueMark}>
          <Icon name="coffee" size={22} color={colors.gold300} />
        </View>
        <View style={{ flex: 1 }}>
          <Title>{cart.venue.name}</Title>
          <Muted style={{ fontSize: 13, marginTop: 3 }}>
            {n(cart.totals.count)} {t('items')}
          </Muted>
        </View>
      </Row>

      <Card style={{ marginBottom: 16, padding: 0, overflow: 'hidden' }}>
        {cart.items.map((item, idx) => (
          <Row
            key={cart.lineKey(item.menuItemId, item.modifierSelections)}
            between
            style={[styles.itemRow, idx === cart.items.length - 1 && { borderBottomWidth: 0 }]}
          >
            <View style={styles.itemIcon}>
              <Icon name="coffee" size={17} color={colors.gold300} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.bold, fontSize: 15 }} numberOfLines={1}>
                {item.name}
              </T>
              {!!item.modifierSummary && (
                <Muted style={{ fontSize: 11, marginTop: 2, color: colors.gold300 }} numberOfLines={1}>
                  {item.modifierSummary}
                </Muted>
              )}
              <Muted style={{ fontSize: 12, marginTop: 3 }}>
                {money(item.price)} × {n(item.quantity)}
              </Muted>
            </View>
            <View style={styles.qtyPill}>
              <IconButton
                name="minus"
                size={13}
                onPress={() => cart.decrementItem(item.menuItemId, item.modifierSelections)}
                style={styles.qtyBtn}
              />
              <T style={{ fontFamily: fonts.black, textAlign: 'center', minWidth: 20, fontSize: 14 }}>
                {n(item.quantity)}
              </T>
              <IconButton
                name="plus"
                size={13}
                onPress={() => cart.incrementItem(item.menuItemId, item.modifierSelections)}
                style={styles.qtyBtn}
              />
            </View>
          </Row>
        ))}
        <View style={styles.totalRow}>
          <Row between>
            <T style={{ fontFamily: fonts.black, fontSize: 18 }}>{t('total')}</T>
            <T style={{ fontFamily: fonts.black, fontSize: 18, color: colors.gold300 }}>{money(cart.totals.amount)}</T>
          </Row>
        </View>
      </Card>

      {cart.venue.acceptsPickup && (
        <Card style={{ marginBottom: 16 }}>
          <Row between>
            <Row style={{ gap: 12, flex: 1 }}>
              <View style={styles.itemIcon}>
                <Icon name="shopping-bag" size={16} color={colors.gold300} />
              </View>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('pickupTitle')}</T>
                <Muted style={{ fontSize: 12, marginTop: 3 }}>{t('pickupHint')}</Muted>
              </View>
            </Row>
            <Switch
              value={isPickup}
              onValueChange={setIsPickup}
              trackColor={{ true: colors.gold400, false: colors.surfaceInput }}
              thumbColor={colors.ink}
            />
          </Row>
        </Card>
      )}

      <Card style={{ marginBottom: 16, gap: 12 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('discountAndPayment')}</T>
        <View style={styles.inputWrap}>
          <Icon name="tag" size={15} color={colors.gold300} style={[styles.inputIcon, isRTL ? { right: 14 } : { left: 14 }]} />
          <Input
            placeholder={t('couponPlaceholder')}
            value={couponCode}
            onChangeText={setCouponCode}
            autoCapitalize="none"
            style={isRTL ? { paddingRight: 38 } : { paddingLeft: 38 }}
          />
        </View>
        <View style={styles.inputWrap}>
          <Icon
            name="credit-card"
            size={15}
            color={colors.gold300}
            style={[styles.inputIcon, isRTL ? { right: 14 } : { left: 14 }]}
          />
          <Input
            placeholder={t('walletPlaceholder')}
            value={walletAmount}
            onChangeText={setWalletAmount}
            keyboardType="numeric"
            style={isRTL ? { paddingRight: 38 } : { paddingLeft: 38 }}
          />
        </View>
        {paymentMethods.length > 1 && (
          <View>
            <Muted style={{ fontSize: 12, marginBottom: 6 }}>{t('paymentMethod')}</Muted>
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              {paymentMethods.map((m) => (
                <Chip
                  key={m.name}
                  icon="credit-card"
                  label={m.label}
                  active={selectedProvider === m.name}
                  onPress={() => setSelectedProvider(m.name)}
                />
              ))}
            </Row>
          </View>
        )}
        {usablePunchCards.length > 0 && (
          <View>
            <Muted style={{ fontSize: 12, marginBottom: 6 }}>{t('punchCardUse')}</Muted>
            <Row style={{ gap: 8, flexWrap: 'wrap' }}>
              <Chip
                label={t('none')}
                active={!selectedPunchCardId}
                onPress={() => setSelectedPunchCardId(null)}
              />
              {usablePunchCards.map((c) => (
                <Chip
                  key={c.id}
                  icon="credit-card"
                  label={`${c.planName} (${c.remainingCredits})`}
                  active={selectedPunchCardId === c.id}
                  onPress={() => setSelectedPunchCardId(c.id)}
                />
              ))}
            </Row>
          </View>
        )}
        {cart.tableId ? (
          <Row style={{ gap: 6 }}>
            <Icon name="grid" size={13} color={colors.inkFaint} />
            <Muted style={{ fontSize: 13 }}>{t('tableNote')}</Muted>
          </Row>
        ) : null}
      </Card>

      <Button
        title={submitting ? t('placingOrder') : t('payAndOrder', { amount: money(cart.totals.amount) })}
        onPress={requestCheckout}
        disabled={submitting}
      />
      <Button title={t('clearCart')} variant="danger" icon="trash-2" onPress={cart.clearCart} style={{ marginTop: 10 }} />

      <Modal visible={showTableModal} transparent animationType="fade" onRequestClose={() => setShowTableModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTableModal(false)} />
          <Card style={[styles.modalCard, { borderRadius: radius.xl }]}>
            <T style={{ fontFamily: fonts.black, fontSize: 20, marginBottom: 8 }}>{t('tableNumberTitle')}</T>
            <Muted style={{ fontSize: 13, marginBottom: 18 }}>{t('tableNumberHint')}</Muted>
            <Input
              placeholder={t('tableNumberPlaceholder')}
              value={tableInput}
              onChangeText={(v) => {
                setTableInput(v);
                setTableError('');
              }}
              keyboardType="number-pad"
              style={{ textAlign: 'center', fontSize: 20, marginBottom: 14 }}
            />
            {!!tableError && (
              <Row style={{ gap: 6, marginBottom: 14, backgroundColor: colors.redBg, borderRadius: radius.md, padding: 12 }}>
                <Icon name="alert-circle" size={14} color={colors.red} />
                <T style={{ fontSize: 13, color: colors.red, flex: 1 }}>{tableError}</T>
              </Row>
            )}
            <Button
              title={tableResolving ? t('loading') : t('confirmTableNumber')}
              onPress={resolveTableAndSubmit}
              disabled={tableResolving || !tableInput.trim()}
            />
            {!!cart.venue.acceptsPickup && (
              <>
                <Row style={{ gap: 10, marginVertical: 14, alignItems: 'center' }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                  <Muted style={{ fontSize: 11 }}>{t('or')}</Muted>
                  <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
                </Row>
                <Button title={t('pickupInstead')} variant="ghost" onPress={pickupInstead} disabled={submitting} />
              </>
            )}
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  venueMark: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(229,196,118,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.full,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: { width: 26, height: 26, borderRadius: radius.sm, backgroundColor: colors.surface },
  totalRow: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(229,196,118,0.08)',
  },
  inputWrap: { justifyContent: 'center' },
  inputIcon: { position: 'absolute', zIndex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 340 },
});
