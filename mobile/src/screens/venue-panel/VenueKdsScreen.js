import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Badge, Card, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts, radius } from '../../theme';

const LANES = [
  { key: 'PENDING', labelKey: 'lanePending', next: 'PREPARING' },
  { key: 'PREPARING', labelKey: 'lanePreparing', next: 'READY' },
  { key: 'READY', labelKey: 'laneReady', next: 'SERVED' },
];

export default function VenueKdsScreen() {
  const { user } = useAuth();
  const { t, n, date } = useI18n();
  const toast = useToast();
  const [orders, setOrders] = useState(null);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/orders/venue/${user.venueId}`);
      setOrders((data || []).filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)));
    } catch {
      setOrders([]);
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 6000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  async function advance(order, next) {
    try {
      await api.patch(`/orders/${order.id}/status`, { status: next });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!orders) return <Loading />;

  return (
    <ScrollView horizontal style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 12 }}>
      <Row style={{ gap: 10, alignItems: 'stretch' }}>
        {LANES.map((lane) => {
          const items = orders.filter((o) => o.status === lane.key);
          return (
            <View key={lane.key} style={{ width: 260 }}>
              <Row between style={{ marginBottom: 8, paddingHorizontal: 4 }}>
                <T style={{ fontFamily: fonts.black, fontSize: 14, color: colors.gold300 }}>{t(lane.labelKey)}</T>
                <Badge label={n(items.length)} />
              </Row>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {items.map((item) => (
                  <Pressable key={item.id} onPress={() => advance(item, lane.next)}>
                    <Card style={{ marginBottom: 8, borderRadius: radius.lg }}>
                      <T style={{ fontFamily: fonts.bold, fontSize: 13 }}>
                        {item.table ? `${t('table')} ${item.table.tableNumber}` : t('pickup')}
                      </T>
                      <Muted style={{ fontSize: 10, marginTop: 3 }}>{date(item.createdAt)}</Muted>
                      {(item.items || []).slice(0, 4).map((it) => (
                        <T key={it.id} style={{ fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                          {n(it.quantity)}× {it.menuItem?.name}
                        </T>
                      ))}
                    </Card>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </Row>
    </ScrollView>
  );
}
