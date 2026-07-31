import { useCallback, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import { Badge, Button, Card, EmptyState, GoldCard, Loading, Muted, Row, T, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function ReferralScreen() {
  const { t, n, money, dateShort } = useI18n();
  const toast = useToast();
  const [info, setInfo] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/referral/me');
      setInfo(data);
    } catch {
      setInfo({ code: '', referrals: [], totalEarned: 0, completedCount: 0, rewardAmount: 0 });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!info) return <Loading />;

  async function shareCode() {
    try {
      await Share.share({ message: t('shareMessage', { code: info.code }) });
    } catch {
      toast.error(t('orderFailed'));
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 8 }}>{t('referral')}</Title>
      <Muted style={{ marginBottom: 18, fontSize: 14, lineHeight: 21 }}>
        {t('refSubtitle', { amount: money(info.rewardAmount) })}
      </Muted>

      <GoldCard style={{ alignItems: 'center', paddingVertical: 28, marginBottom: 16 }}>
        <T style={{ textAlign: 'center', fontSize: 13, fontFamily: fonts.medium, color: 'rgba(29,27,22,0.65)' }}>
          {t('yourCode')}
        </T>
        <T
          selectable
          style={{
            fontFamily: fonts.black,
            fontSize: 28,
            color: colors.charcoal,
            marginVertical: 10,
            letterSpacing: 2,
            textAlign: 'center',
          }}
        >
          {info.code}
        </T>
        <Button icon="share-2" title={t('shareCode')} variant="ghost" onPress={shareCode} style={{ marginTop: 2 }} />
      </GoldCard>

      <Row style={{ gap: 10, marginBottom: 16 }}>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
          <T style={{ fontFamily: fonts.black, fontSize: 22, color: colors.gold300, textAlign: 'center' }}>
            {n(info.completedCount)}
          </T>
          <Muted style={{ fontSize: 12, marginTop: 5, textAlign: 'center' }}>{t('successfulInvites')}</Muted>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 18 }}>
          <T style={{ fontFamily: fonts.black, fontSize: 17, color: colors.gold300, textAlign: 'center' }}>
            {money(info.totalEarned)}
          </T>
          <Muted style={{ fontSize: 12, marginTop: 5, textAlign: 'center' }}>{t('totalRewards')}</Muted>
        </Card>
      </Row>

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('invitedFriends')}</T>
      {info.referrals.length === 0 ? (
        <EmptyState icon="users" title={t('noInvites')} />
      ) : (
        info.referrals.map((r, i) => (
          <Card key={i} style={{ marginBottom: 10, paddingVertical: 14 }}>
            <Row between>
              <View>
                <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{r.refereeName}</T>
                <Muted style={{ fontSize: 12, marginTop: 3 }}>{dateShort(r.createdAt)}</Muted>
              </View>
              <Badge
                label={r.status === 'COMPLETED' ? t('completedReward', { amount: money(r.rewardAmount) }) : t('waitingFirstOrder')}
                tone={r.status === 'COMPLETED' ? 'green' : 'muted'}
              />
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
