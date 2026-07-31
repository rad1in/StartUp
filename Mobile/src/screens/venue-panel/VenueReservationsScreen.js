import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Badge, Button, Card, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function VenueReservationsScreen() {
  const { user } = useAuth();
  const { t, n, date } = useI18n();
  const toast = useToast();
  const [reservations, setReservations] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/venues/${user.venueId}/reservations`);
      setReservations(data || []);
    } catch {
      setReservations([]);
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function setStatus(reservation, status) {
    try {
      await api.patch(`/venues/${user.venueId}/reservations/${reservation.id}`, { status });
      toast.success(status === 'CONFIRMED' ? t('reservationApproved') : t('reservationDeclined'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!reservations) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={reservations}
      keyExtractor={(r) => r.id}
      ListEmptyComponent={<EmptyState icon="calendar" title={t('noReservations')} subtitle={t('noReservationsHint')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{item.guestName}</T>
            <Badge label={t(`rsv${item.status}`)} tone={item.status === 'CONFIRMED' ? 'green' : item.status === 'DECLINED' ? 'red' : 'gold'} />
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>{item.guestPhone}</Muted>
          <Muted style={{ fontSize: 11, marginTop: 2 }}>
            {date(item.reservationTime)} · {n(item.partySize)} {t('guests')}
            {item.tableNumber ? ` · ${t('table')} ${item.tableNumber}` : ''}
          </Muted>
          {item.notes ? (
            <T style={{ fontSize: 12, marginTop: 6 }} numberOfLines={2}>
              {item.notes}
            </T>
          ) : null}
          {item.status === 'PENDING' && (
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Button small title={t('approve')} onPress={() => setStatus(item, 'CONFIRMED')} style={{ flex: 1 }} />
              <Button small variant="ghost" title={t('decline')} onPress={() => setStatus(item, 'CANCELLED')} style={{ flex: 1 }} />
            </Row>
          )}
        </Card>
      )}
    />
  );
}
