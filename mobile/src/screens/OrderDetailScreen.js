import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api from '../api/client';
import { Badge, Button, Card, Icon, Loading, Muted, Row, T, Title } from '../components/UI';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useBattery } from '../context/BatteryContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

export default function OrderDetailScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { t, n, money, date, isRTL } = useI18n();
  const toast = useToast();
  const cart = useCart();
  const { isLowBattery } = useBattery();
  const [order, setOrder] = useState(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingTaxInvoice, setSendingTaxInvoice] = useState(false);
  const pollRef = useRef(null);

  const TIMELINE = [
    { key: 'PENDING', label: t('stagePlaced') },
    { key: 'PREPARING', label: t('stagePreparing') },
    { key: 'READY', label: t('stageReady') },
    { key: 'SERVED', label: t('stageServed') },
  ];

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/${orderId}`);
      setOrder(data);
    } catch {
      /* keep last state */
    }
  }, [orderId]);

  useEffect(() => {
    refresh();
    // Low-battery mode polls far less often — order status still updates,
    // just with less network/CPU wake-up activity to conserve power.
    pollRef.current = setInterval(refresh, isLowBattery ? 30000 : 8000);
    return () => clearInterval(pollRef.current);
  }, [refresh, isLowBattery]);

  if (!order) return <Loading />;

  const stageIndex = order.status === 'CANCELLED' ? -1 : TIMELINE.findIndex((s) => s.key === order.status);

  async function reorder() {
    try {
      const { data } = await api.post(`/orders/${orderId}/reorder`);
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

  function confirmCancelOrder() {
    Alert.alert(t('cancelOrderTitle'), t('cancelOrderConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('cancelOrderConfirmBtn'),
        style: 'destructive',
        onPress: async () => {
          try {
            const { data } = await api.post(`/orders/${orderId}/cancel`);
            setOrder(data);
            toast.success(t('orderCancelledSuccess'));
          } catch (err) {
            toast.error(err.response?.data?.message || t('orderFailed'));
          }
        },
      },
    ]);
  }

  async function sendReceiptSms() {
    setSendingSms(true);
    try {
      await api.post(`/orders/${orderId}/receipt/sms`);
      toast.success(t('receiptSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSendingSms(false);
    }
  }

  async function sendReceiptEmail() {
    setSendingEmail(true);
    try {
      await api.post(`/orders/${orderId}/receipt/email`);
      toast.success(t('receiptSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSendingEmail(false);
    }
  }

  async function sendTaxInvoiceEmail() {
    setSendingTaxInvoice(true);
    try {
      await api.post(`/orders/${orderId}/tax-invoice/email`);
      toast.success(t('receiptSent'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('taxInvoiceNotIssued'));
    } finally {
      setSendingTaxInvoice(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 12 }}>{t('orderStatus')}</Title>

      {order.status === 'CANCELLED' ? (
        <Card style={{ marginBottom: 14, backgroundColor: colors.redBg }}>
          <Row style={{ gap: 8 }}>
            <Icon name="x-circle" size={18} color={colors.red} />
            <T style={{ color: colors.red, fontFamily: fonts.bold, fontSize: 15 }}>{t('orderCancelled')}</T>
          </Row>
        </Card>
      ) : (
        <Card gold style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
            {TIMELINE.map((stage, i) => {
              const done = stageIndex >= i;
              return (
                <View key={stage.key} style={styles.stage}>
                  <View style={[styles.dot, done && styles.dotDone]}>
                    {done && <Icon name="check" size={14} color={colors.charcoal} />}
                  </View>
                  <T style={[styles.stageLabel, done && { color: colors.ink, fontFamily: fonts.medium }]}>
                    {stage.label}
                  </T>
                </View>
              );
            })}
          </View>
          {order.prepEstimate && ['PENDING', 'PREPARING'].includes(order.status) && (
            <Muted style={{ fontSize: 11, textAlign: 'center', marginTop: 12 }}>
              {t('prepEstimate', { n: order.prepEstimate.estimatedMinutes })}
              {!order.prepEstimate.basedOnHistory ? ` (${t('prepEstimateRough')})` : ''}
            </Muted>
          )}
        </Card>
      )}

      <Card style={{ marginBottom: 14 }}>
        <Row between style={{ marginBottom: 10 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{order.venue?.name}</T>
          <Row style={{ gap: 6 }}>
            <Badge
              label={t(`st${order.status}`)}
              tone={order.status === 'SERVED' ? 'green' : order.status === 'CANCELLED' ? 'red' : 'gold'}
            />
            <Badge label={t(`py${order.paymentStatus}`)} tone={order.paymentStatus === 'SUCCESS' ? 'green' : 'muted'} />
          </Row>
        </Row>
        <Muted style={{ fontSize: 12 }}>
          {t('orderNo')}: {order.id}
        </Muted>
        <Muted style={{ fontSize: 12, marginTop: 3 }}>
          {t('placedAt')}: {date(order.createdAt)}
        </Muted>
        {order.table && (
          <Muted style={{ fontSize: 12, marginTop: 3 }}>
            {t('table')}: {order.table.tableNumber}
          </Muted>
        )}

        <View style={{ marginTop: 14 }}>
          {(order.items || []).map((item) => (
            <Row key={item.id} between style={styles.itemRow}>
              <T style={{ flex: 1, fontSize: 14 }}>
                {item.menuItem?.name} × {n(item.quantity)}
              </T>
              <T style={{ fontSize: 14 }}>{money(item.subtotal)}</T>
            </Row>
          ))}
        </View>

        {Number(order.discountAmount) > 0 && (
          <Row between style={{ marginTop: 10 }}>
            <T style={{ color: colors.green, fontFamily: fonts.medium }}>{t('discount')}</T>
            <T style={{ color: colors.green, fontFamily: fonts.medium }}>-{money(order.discountAmount)}</T>
          </Row>
        )}
        <Row between style={{ marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          <T style={{ fontFamily: fonts.black, fontSize: 18 }}>{t('total')}</T>
          <T style={{ fontFamily: fonts.black, fontSize: 18, color: colors.gold300 }}>{money(order.totalAmount)}</T>
        </Row>
      </Card>

      <Button icon="rotate-ccw" title={t('reorder')} onPress={reorder} />
      {order.status === 'PENDING' && (
        <Button
          icon="x-circle"
          title={t('cancelOrder')}
          variant="danger"
          onPress={confirmCancelOrder}
          style={{ marginTop: 10 }}
        />
      )}
      {order.status === 'SERVED' && (
        <Button
          icon="star"
          title={t('submitReview')}
          variant="ghost"
          onPress={() => router.push(`/reviews?orderId=${order.id}&venueId=${order.venueId}`)}
          style={{ marginTop: 10 }}
        />
      )}
      <Button
        icon="message-square"
        title={sendingSms ? t('sending') : t('sendReceiptSms')}
        variant="ghost"
        onPress={sendReceiptSms}
        disabled={sendingSms}
        style={{ marginTop: 10 }}
      />
      <Button
        icon="mail"
        title={sendingEmail ? t('sending') : t('sendReceiptEmail')}
        variant="ghost"
        onPress={sendReceiptEmail}
        disabled={sendingEmail}
        style={{ marginTop: 10 }}
      />
      <Button
        icon="file-text"
        title={sendingTaxInvoice ? t('sending') : t('sendTaxInvoiceEmail')}
        variant="ghost"
        onPress={sendTaxInvoiceEmail}
        disabled={sendingTaxInvoice}
        style={{ marginTop: 10 }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', gap: 8 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.gold300 },
  stageLabel: { fontSize: 11, color: colors.inkFaint, textAlign: 'center' },
  itemRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
});
