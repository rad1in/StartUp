import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Card, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function AdminLiveOpsScreen() {
  const { t, n, date } = useI18n();
  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/admin/dashboard').catch(() => ({ data: null }));
    setDashboard(data);
    try {
      const { data: h } = await api.get('/admin/system-health');
      setHealth(h);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 15000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  if (!dashboard) return <Loading />;

  const activity = dashboard.feed?.activity || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {health && (
        <Row style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <StatTile icon="alert-triangle" label={t('apiErrors24h')} value={n(health.apiErrorsLast24h || 0)} tone="red" />
          <StatTile icon="x-circle" label={t('failedPayments')} value={n(health.failedPayments || 0)} tone="red" />
        </Row>
      )}
      {forbidden && !health && (
        <Card style={{ marginBottom: 14 }}>
          <T style={{ fontSize: 12, color: colors.inkMuted }}>{t('noAccessHint')}</T>
        </Card>
      )}

      <Card>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('recentActivity')}</T>
        {activity.length === 0 ? (
          <EmptyState icon="activity" title={t('noActivity')} />
        ) : (
          activity.slice(0, 20).map((a, i) => (
            <Row key={a.id || i} between style={{ paddingVertical: 6 }}>
              <T style={{ fontSize: 12, flex: 1 }} numberOfLines={1}>
                {a.action || a.type}
              </T>
              <Muted style={{ fontSize: 10 }}>{date(a.createdAt)}</Muted>
            </Row>
          ))
        )}
      </Card>
    </ScrollView>
  );
}
