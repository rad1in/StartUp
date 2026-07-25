import { useCallback, useEffect, useState } from 'react';
import { FlatList } from 'react-native';
import { Badge, Button, Card, EmptyState, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function VenueShiftsScreen() {
  const { user } = useAuth();
  const { t, date } = useI18n();
  const toast = useToast();
  const [shifts, setShifts] = useState(null);

  const load = useCallback(async () => {
    try {
      const today = new Date();
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const { data } = await api.get(`/venues/${user.venueId}/shifts`, { params: { from } });
      setShifts(data || []);
    } catch {
      setShifts([]);
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
  }, [load]);

  async function clockIn(shift) {
    try {
      await api.post(`/venues/${user.venueId}/shifts/${shift.id}/clock-in`);
      toast.success(t('clockedIn'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function clockOut(shift) {
    try {
      await api.post(`/venues/${user.venueId}/shifts/${shift.id}/clock-out`);
      toast.success(t('clockedOut'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!shifts) return <Loading />;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      data={shifts}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('todayShifts')}</T>
      }
      ListEmptyComponent={<EmptyState icon="clock" title={t('noShifts')} subtitle={t('noShiftsHint')} />}
      renderItem={({ item }) => (
        <Card style={{ marginBottom: 10 }}>
          <Row between>
            <T style={{ fontFamily: fonts.medium, fontSize: 13 }}>{item.userName}</T>
            {item.clockInAt && !item.clockOutAt && <Badge label={t('clockedIn')} tone="green" />}
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>
            {date(item.scheduledStart)} — {date(item.scheduledEnd)}
          </Muted>
          {item.note ? (
            <T style={{ fontSize: 12, marginTop: 6 }} numberOfLines={2}>
              {item.note}
            </T>
          ) : null}
          {user.id === item.userId && (
            <Row style={{ gap: 8, marginTop: 10 }}>
              {!item.clockInAt && (
                <Button small title={t('clockIn')} onPress={() => clockIn(item)} style={{ flex: 1 }} />
              )}
              {item.clockInAt && !item.clockOutAt && (
                <Button small variant="ghost" title={t('clockOut')} onPress={() => clockOut(item)} style={{ flex: 1 }} />
              )}
            </Row>
          )}
        </Card>
      )}
    />
  );
}
