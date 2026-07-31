import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Card, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function VenueDashboardScreen() {
  const { user } = useAuth();
  const { t, n, money } = useI18n();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/accounting/${user.venueId}/dashboard`);
      setData(res);
    } catch {
      setData({ today: { orderCount: 0, totalRevenue: 0, activeCount: 0 }, topItems: [], peakHours: [] });
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Loading />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
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
    >
      <Row style={{ gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <StatTile icon="shopping-bag" label={t('todayOrders')} value={n(data.today?.orderCount || 0)} />
        <StatTile icon="dollar-sign" label={t('todayRevenue')} value={money(data.today?.totalRevenue || 0)} tone="green" />
        <StatTile icon="loader" label={t('activeOrders')} value={n(data.today?.activeCount || 0)} />
      </Row>

      {Array.isArray(data.topItems) && data.topItems.length > 0 && (
        <Card style={{ marginTop: 10 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('topItems')}</T>
          {data.topItems.slice(0, 6).map((item, i) => (
            <Row key={item.id || i} between style={{ paddingVertical: 6 }}>
              <T style={{ fontSize: 13, flex: 1 }} numberOfLines={1}>
                {item.name}
              </T>
              <Muted style={{ fontSize: 12 }}>{n(item.quantity || item.count || 0)}</Muted>
            </Row>
          ))}
        </Card>
      )}

      {Array.isArray(data.peakHours) && data.peakHours.length > 0 && (
        <Card style={{ marginTop: 10 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('peakHours')}</T>
          <Row style={{ gap: 6, flexWrap: 'wrap' }}>
            {data.peakHours.slice(0, 8).map((h, i) => (
              <View
                key={i}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <T style={{ fontSize: 11 }}>
                  {h.hour != null ? `${h.hour}:00` : ''} · {n(h.count || 0)}
                </T>
              </View>
            ))}
          </Row>
        </Card>
      )}
    </ScrollView>
  );
}
