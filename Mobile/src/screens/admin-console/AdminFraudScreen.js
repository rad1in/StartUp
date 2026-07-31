import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Badge, Button, Card, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function AdminFraudScreen() {
  const { t, n, date } = useI18n();
  const toast = useToast();
  const [flags, setFlags] = useState(null);
  const [summary, setSummary] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: list }, { data: sum }] = await Promise.all([
        api.get('/fraud', { params: { status: 'OPEN' } }),
        api.get('/fraud/summary'),
      ]);
      setFlags(list.flags || []);
      setSummary(sum);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      setFlags([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(flag, status) {
    try {
      await api.patch(`/fraud/${flag.id}/review`, { status });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (forbidden) return <EmptyState icon="lock" title={t('noAccessTitle')} subtitle={t('noAccessHint')} />;
  if (!flags) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={flags}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={
        summary && (
          <Row style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <StatTile icon="shield" label={t('fraudAlerts')} value={n(summary.open || 0)} tone="red" />
            <StatTile icon="alert-circle" label={t('riskScore')} value={n(summary.highRisk || 0)} tone="red" />
          </Row>
        )
      }
      ListEmptyComponent={<EmptyState icon="shield" title={t('noFraudAlerts')} subtitle={t('noFraudAlertsHint')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>
              {item.entityName || item.entityType}
            </T>
            <Badge label={`${t('riskScore')}: ${n(item.riskScore || 0)}`} tone="red" />
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>{date(item.createdAt)}</Muted>
          <Row style={{ gap: 8, marginTop: 10 }}>
            <Button small variant="ghost" title={t('markReviewing')} onPress={() => review(item, 'REVIEWING')} style={{ flex: 1 }} />
            <Button small variant="ghost" title={t('markActioned')} onPress={() => review(item, 'ACTIONED')} style={{ flex: 1 }} />
            <Button small variant="danger" title={t('dismissAlert')} onPress={() => review(item, 'DISMISSED')} style={{ flex: 1 }} />
          </Row>
        </Card>
      )}
    />
  );
}
