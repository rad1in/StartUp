import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import { Badge, Button, Card, EmptyState, Loading, Muted, Row, T, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function SubscriptionScreen() {
  const { t, n, money, dateShort } = useI18n();
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: p }, { data: m }] = await Promise.all([api.get('/subscription/plan'), api.get('/subscription/me')]);
      setPlan(p);
      setMine(m);
    } catch {
      setPlan({ enabled: false, price: 0 });
      setMine({ active: false });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function purchase() {
    setBusy(true);
    try {
      await api.post('/subscription/purchase');
      toast.success(t('subActivated'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (!plan || !mine) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 8 }}>{t('subTitle')}</Title>
      <Muted style={{ marginBottom: 18, fontSize: 14, lineHeight: 21 }}>{t('subSubtitle')}</Muted>

      {mine.active ? (
        <Card gold style={{ marginBottom: 16 }}>
          <Row between style={{ marginBottom: 12 }}>
            <T style={{ fontFamily: fonts.black, fontSize: 17 }}>{t('subActive')}</T>
            <Badge icon="clock" label={t('daysLeft', { n: n(mine.daysLeft) })} tone="green" />
          </Row>
          <Muted style={{ fontSize: 13 }}>
            {t('starts')}: {dateShort(mine.startsAt)}
          </Muted>
          <Muted style={{ fontSize: 13, marginTop: 3 }}>
            {t('ends')}: {dateShort(mine.expiresAt)}
          </Muted>
          <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Row between>
              <Muted style={{ fontSize: 13 }}>{t('highDiscountsUsed')}</Muted>
              <T style={{ fontFamily: fonts.bold, color: colors.gold300 }}>
                {t('outOf', { a: n(mine.highDiscountCount), b: n(mine.highDiscountCap) })}
              </T>
            </Row>
          </View>
        </Card>
      ) : (
        <Card style={{ marginBottom: 16 }}>
          <EmptyState icon="zap" title={t('noSub')} subtitle={t('subPriceLine', { price: money(plan.price) })} />
        </Card>
      )}

      <Card style={{ marginBottom: 16, gap: 10 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{t('howItWorks')}</T>
        <Muted style={{ fontSize: 13, lineHeight: 21 }}>{t('subHow')}</Muted>
      </Card>

      {!mine.active && (
        <Button
          title={
            !plan.enabled ? t('subDisabled') : busy ? t('activating') : t('activateSub', { price: money(plan.price) })
          }
          onPress={purchase}
          disabled={busy || !plan.enabled}
        />
      )}
    </ScrollView>
  );
}
