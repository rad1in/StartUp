import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Card, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function AdminDashboardScreen() {
  const { t, n, money, date } = useI18n();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get('/admin/dashboard');
      setData(res);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      setData({ kpis: {}, feed: { activity: [], recentOrders: [] } });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Loading />;
  if (forbidden) return <EmptyState icon="lock" title={t('noAccessTitle')} subtitle={t('noAccessHint')} />;

  const kpis = data.kpis || {};

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
        <StatTile icon="coffee" label={t('totalVenues')} value={n(kpis.venueCount || 0)} />
        <StatTile icon="users" label={t('totalCustomers')} value={n(kpis.customerCount || 0)} />
        <StatTile icon="shopping-bag" label={t('ordersToday')} value={n(kpis.ordersToday || 0)} />
        <StatTile icon="dollar-sign" label={t('gmv')} value={money(kpis.gmv || 0)} tone="green" />
        <StatTile icon="percent" label={t('platformCommission')} value={money(kpis.totalCommission || 0)} />
      </Row>

      {Array.isArray(data.feed?.recentOrders) && data.feed.recentOrders.length > 0 && (
        <Card>
          <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('recentActivity')}</T>
          {data.feed.recentOrders.slice(0, 8).map((o) => (
            <Row key={o.id} between style={{ paddingVertical: 6 }}>
              <T style={{ fontSize: 13, flex: 1 }} numberOfLines={1}>
                {o.venueName}
              </T>
              <Muted style={{ fontSize: 11 }}>
                {money(o.totalAmount)} · {date(o.createdAt)}
              </Muted>
            </Row>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}
