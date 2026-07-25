import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList } from 'react-native';
import { Badge, Button, Card, EmptyState, Icon, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const NEXT_STATUS = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'SERVED' };
const NEXT_LABEL_KEY = { PENDING: 'acceptOrder', PREPARING: 'markReady', READY: 'markServed' };

export default function VenueOrdersScreen() {
  const { user } = useAuth();
  const { t, n, money, date } = useI18n();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const pollRef = useRef(null);
  const waiterPollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/venue/${user.venueId}`, {
        params: { status: undefined },
      });
      const active = (data || []).filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status));
      setOrders(active);
    } catch {
      setOrders([]);
    }
  }, [user.venueId]);

  const loadWaiterCalls = useCallback(async () => {
    try {
      const { data } = await api.get(`/waiter-calls/venue/${user.venueId}`);
      setWaiterCalls(data || []);
    } catch {
      setWaiterCalls([]);
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  useEffect(() => {
    loadWaiterCalls();
    waiterPollRef.current = setInterval(loadWaiterCalls, 6000);
    return () => clearInterval(waiterPollRef.current);
  }, [loadWaiterCalls]);

  async function resolveWaiterCall(call) {
    setWaiterCalls((prev) => prev.filter((c) => c.id !== call.id));
    try {
      await api.patch(`/waiter-calls/venue/${user.venueId}/${call.id}/resolve`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
      loadWaiterCalls();
    }
  }

  async function advance(order) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!orders) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={orders}
      keyExtractor={(o) => o.id}
      ListHeaderComponent={
        waiterCalls.length > 0 ? (
          <>
            {waiterCalls.map((call) => (
              <Card key={call.id} style={{ marginBottom: 10, backgroundColor: colors.goldBg || colors.surfaceHigh }}>
                <Row between>
                  <Row style={{ gap: 8, flex: 1 }}>
                    <Icon name="bell" size={16} color={colors.gold300} />
                    <T style={{ fontFamily: fonts.bold, fontSize: 13, flex: 1 }}>
                      {t('waiterHelpRequest', { n: call.tableNumber })}
                    </T>
                  </Row>
                </Row>
                {!!call.note && <Muted style={{ fontSize: 11, marginTop: 4 }}>{call.note}</Muted>}
                <Button
                  small
                  title={t('resolveWaiterCall')}
                  onPress={() => resolveWaiterCall(call)}
                  style={{ marginTop: 10, alignSelf: 'flex-start' }}
                />
              </Card>
            ))}
          </>
        ) : null
      }
      ListEmptyComponent={<EmptyState icon="shopping-bag" title={t('noActiveOrders')} subtitle={t('noActiveOrdersHint')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>
              {item.table ? `${t('table')} ${item.table.tableNumber}` : t('pickup')}
            </T>
            <Badge label={t(`st${item.status}`)} tone={item.status === 'READY' ? 'green' : 'gold'} />
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>{date(item.createdAt)}</Muted>
          <Muted style={{ fontSize: 11, marginTop: 2 }}>
            {n((item.items || []).length)} {t('items')} · {money(item.totalAmount)}
          </Muted>
          {NEXT_STATUS[item.status] && (
            <Button small title={t(NEXT_LABEL_KEY[item.status])} onPress={() => advance(item)} style={{ marginTop: 10, alignSelf: 'flex-start' }} />
          )}
        </Card>
      )}
    />
  );
}
