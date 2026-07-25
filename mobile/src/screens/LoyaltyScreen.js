import { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import { Badge, Card, EmptyState, GoldCard, Loading, Muted, Row, T, Title } from '../components/UI';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function LoyaltyScreen() {
  const { t, n, date } = useI18n();
  const [points, setPoints] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [gami, setGami] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: b }, { data: tx }] = await Promise.all([
        api.get('/loyalty/balance'),
        api.get('/loyalty/transactions'),
      ]);
      setPoints(b);
      setTransactions(tx);
    } catch {
      setPoints({});
    }
    api
      .get('/gamification/me')
      .then(({ data }) => setGami(data))
      .catch(() => setGami({}));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (points === null) return <Loading />;

  const badges = gami?.badges || gami?.earnedBadges || [];
  const tier = gami?.tier || gami?.currentTier;
  const pointsValue = Object.values(points || {}).find((v) => typeof v === 'number');

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 18 }}>{t('loyalty')}</Title>

      <Row style={{ gap: 10, marginBottom: 16 }}>
        <GoldCard style={{ flex: 1, alignItems: 'center', paddingVertical: 24 }}>
          <T style={{ textAlign: 'center', fontSize: 13, fontFamily: fonts.medium, color: 'rgba(29,27,22,0.65)' }}>
            {t('loyaltyPoints')}
          </T>
          <T style={{ fontFamily: fonts.black, fontSize: 30, color: colors.charcoal, marginTop: 8, textAlign: 'center' }}>
            {n(pointsValue || 0)}
          </T>
        </GoldCard>
        {tier && (
          <Card style={{ flex: 1, alignItems: 'center', paddingVertical: 24, justifyContent: 'center' }}>
            <Muted style={{ textAlign: 'center', fontSize: 13 }}>{t('clubTier')}</Muted>
            <T style={{ fontFamily: fonts.black, fontSize: 20, color: colors.gold300, marginTop: 8, textAlign: 'center' }}>
              {tier.name || tier}
            </T>
          </Card>
        )}
      </Row>

      {badges.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 12 }}>{t('yourBadges')}</T>
          <Row style={{ flexWrap: 'wrap', gap: 8 }}>
            {badges.map((b, i) => (
              <Badge key={i} icon="award" label={b.name || b.title || ''} />
            ))}
          </Row>
        </Card>
      )}

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('pointsHistory')}</T>
      {transactions.length === 0 ? (
        <EmptyState icon="star" title={t('noPoints')} subtitle={t('noPointsHint')} />
      ) : (
        transactions.map((tx) => (
          <Card key={tx.id} style={{ marginBottom: 10, paddingVertical: 14 }}>
            <Row between>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14, fontFamily: fonts.medium }}>{tx.description || tx.reason || tx.type}</T>
                <Muted style={{ fontSize: 12, marginTop: 3 }}>{date(tx.createdAt)}</Muted>
              </View>
              <T style={{ fontFamily: fonts.bold, color: Number(tx.points ?? tx.amount) >= 0 ? colors.green : colors.red }}>
                {Number(tx.points ?? tx.amount) >= 0 ? '+' : ''}
                {n(tx.points ?? tx.amount)}
              </T>
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
