import { useCallback, useMemo, useState } from 'react';
import { SectionList, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import api from '../api/client';
import { Card, EmptyState, Icon, Loading, Muted, Row, T, Title, Button } from '../components/UI';
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

const CUSTOMER_CATEGORIES = ['ORDER_STATUS', 'PROMO', 'LOYALTY', 'SYSTEM'];
const CATEGORY_LABEL_KEYS = {
  ORDER_STATUS: 'notifCategoryOrderStatus',
  PROMO: 'notifCategoryPromo',
  LOYALTY: 'notifCategoryLoyalty',
  SYSTEM: 'notifCategorySystem',
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
  const [preferences, setPreferences] = useState([]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(Array.isArray(data) ? data : data.notifications || []);
    } catch {
      setNotifications([]);
    }
    try {
      const { data: prefs } = await api.get('/notifications/preferences');
      setPreferences(prefs.filter((p) => CUSTOMER_CATEGORIES.includes(p.category)));
    } catch {
      setPreferences([]);
    }
  }, []);

  async function togglePreference(category, enabled) {
    try {
      await api.patch('/notifications/preferences', { category, enabled });
      setPreferences((prev) => prev.map((p) => (p.category === category ? { ...p, enabled } : p)));
    } catch {
      // non-critical background preference — a failed toggle just won't stick, no need to interrupt the user
    }
  }

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
          <View style={{ marginBottom: 18 }}>
            <Row between style={{ marginBottom: 18 }}>
              <Title>{t('notifications')}</Title>
              {notifications.some((x) => !x.isRead) && (
                <Button small variant="ghost" icon="check-circle" title={t('markAllRead')} onPress={markAllRead} />
              )}
            </Row>

            {preferences.length > 0 && (
              <Card style={{ marginBottom: 4 }}>
                <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('notifPreferencesTitle')}</T>
                {preferences.map((pref) => (
                  <Row key={pref.category} between style={{ paddingVertical: 6 }}>
                    <T style={{ fontSize: 13 }}>{t(CATEGORY_LABEL_KEYS[pref.category] || pref.category)}</T>
                    <Switch
                      value={pref.enabled}
                      onValueChange={(v) => togglePreference(pref.category, v)}
                      trackColor={{ false: colors.surfaceHigh, true: colors.gold300 }}
                    />
                  </Row>
                ))}
              </Card>
            )}
          </View>
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
