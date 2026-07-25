import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Badge, Button, Card, Chip, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const STATUS_TONE = { PENDING: 'gold', ACTIVE: 'green', SUSPENDED: 'red', REJECTED: 'red' };

export default function AdminVenuesScreen() {
  const { t, date } = useI18n();
  const toast = useToast();
  const [venues, setVenues] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async (status) => {
    try {
      const { data } = await api.get('/admin/venues', { params: status ? { status } : undefined });
      setVenues(data || []);
    } catch (err) {
      if (err.response?.status === 403) setForbidden(true);
      setVenues([]);
    }
  }, []);

  useEffect(() => {
    load(filter === 'ALL' ? undefined : filter);
  }, [load, filter]);

  async function act(venue, action) {
    try {
      await api.patch(`/admin/venues/${venue.id}/${action}`);
      toast.success(action === 'approve' ? t('venueApproved') : t('venueRejected'));
      load(filter === 'ALL' ? undefined : filter);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (forbidden) return <EmptyState icon="lock" title={t('noAccessTitle')} subtitle={t('noAccessHint')} />;
  if (!venues) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={venues}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <Row style={{ gap: 8, marginBottom: 12 }}>
          <Chip label={t('pendingVenues')} active={filter === 'PENDING'} onPress={() => setFilter('PENDING')} />
          <Chip label={t('allVenues')} active={filter === 'ALL'} onPress={() => setFilter('ALL')} />
        </Row>
      }
      ListEmptyComponent={<EmptyState icon="coffee" title={filter === 'PENDING' ? t('noPendingVenues') : t('noVenues')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>
              {item.name}
            </T>
            <Badge label={item.status} tone={STATUS_TONE[item.status] || 'gold'} />
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>
            {item.city} · {item.owner?.name || ''}
          </Muted>
          <Muted style={{ fontSize: 11, marginTop: 2 }}>{date(item.createdAt)}</Muted>
          {item.status === 'PENDING' && (
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Button small title={t('approveVenue')} onPress={() => act(item, 'approve')} style={{ flex: 1 }} />
              <Button small variant="ghost" title={t('rejectVenue')} onPress={() => act(item, 'reject')} style={{ flex: 1 }} />
            </Row>
          )}
        </Card>
      )}
    />
  );
}
