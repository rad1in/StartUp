import { useCallback, useMemo, useState } from 'react';
import { SectionList, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import api from '../api/client';
import { Button, EmptyState, Icon, Loading, Muted, Row, T, Title } from '../components/UI';
import { PressableScale } from '../components/motion';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

const TYPE_META = {
  ORDER_STATUS: { icon: 'shopping-bag', color: colors.gold300 },
  NEW_ORDER: { icon: 'shopping-bag', color: colors.gold300 },
  PROMO: { icon: 'gift', color: colors.green },
  LOYALTY: { icon: 'award', color: colors.gold300 },
  SYSTEM: { icon: 'info', color: colors.inkMuted },
  LOW_REVIEW: { icon: 'star', color: colors.red },
};

function isToday(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t, date } = useI18n();
  const [notifications, setNotifications] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const sections = useMemo(() => {
    if (!notifications) return [];
    const today = notifications.filter((n) => isToday(n.createdAt));
    const earlier = notifications.filter((n) => !isToday(n.createdAt));
    const out = [];
    if (today.length) out.push({ title: t('today'), data: today });
    if (earlier.length) out.push({ title: t('earlier'), data: earlier });
    return out;
  }, [notifications, t]);

  if (!notifications) return <Loading />;

  async function markAllRead() {
    await api.patch('/notifications/read-all').catch(() => {});
    load();
  }

  async function handlePress(notif) {
    if (!notif.isRead) {
      api.patch(`/notifications/${notif.id}/read`).catch(() => {});
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)));
    }
    const data = notif.data || {};
    if (data.orderId) router.push(`/order/${data.orderId}`);
    else if (data.ticketId) router.push(`/support-ticket/${data.ticketId}`);
    else if (data.reviewId) router.push('/reviews');
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SectionList
        sections={sections}
        keyExtractor={(n) => n.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
        ListHeaderComponent={
          <Row between style={{ marginBottom: 18 }}>
            <Title>{t('notifications')}</Title>
            {notifications.some((x) => !x.isRead) && (
              <Button small variant="ghost" icon="check-circle" title={t('markAllRead')} onPress={markAllRead} />
            )}
          </Row>
        }
        ListEmptyComponent={<EmptyState icon="bell-off" title={t('noNotifications')} />}
        renderSectionHeader={({ section }) => (
          <T style={{ fontFamily: fonts.black, fontSize: 13, color: colors.gold300, marginBottom: 10, marginTop: 4 }}>
            {section.title}
          </T>
        )}
        renderItem={({ item: notif }) => {
          const meta = TYPE_META[notif.type] || TYPE_META.SYSTEM;
          return (
            <PressableScale onPress={() => handlePress(notif)} style={{ marginBottom: 10 }}>
              <Row style={{ gap: 12, backgroundColor: notif.isRead ? colors.surface : 'rgba(229,196,118,0.08)', padding: 14, borderRadius: radius.lg }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: 'rgba(229,196,118,0.12)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name={meta.icon} size={18} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Row between>
                    <T style={{ fontFamily: notif.isRead ? fonts.medium : fonts.bold, fontSize: 15, flex: 1 }} numberOfLines={2}>
                      {notif.title}
                    </T>
                    {!notif.isRead && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold300, marginTop: 5 }} />}
                  </Row>
                  {notif.body ? (
                    <Muted style={{ fontSize: 13, marginTop: 4 }} numberOfLines={2}>
                      {notif.body}
                    </Muted>
                  ) : null}
                  <Muted style={{ fontSize: 11, marginTop: 6, color: colors.inkFaint }}>{date(notif.createdAt)}</Muted>
                </View>
              </Row>
            </PressableScale>
          );
        }}
      />
    </View>
  );
}
