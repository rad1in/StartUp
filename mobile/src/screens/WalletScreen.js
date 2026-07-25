import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';
import { Button, Card, Chip, EmptyState, GoldCard, Input, Loading, Muted, Row, T, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function WalletScreen() {
  const { t, money, date } = useI18n();
  const toast = useToast();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ data: b }, { data: tx }] = await Promise.all([api.get('/wallet'), api.get('/wallet/transactions')]);
      setBalance(b.balance);
      setTransactions(tx);
    } catch {
      setBalance(0);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    api
      .get('/payments/methods')
      .then(({ data }) => {
        setPaymentMethods(data);
        setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
      })
      .catch(() => {});
  }, []);

  async function topUp() {
    const value = Number(amount);
    if (!value || value <= 0) return toast.error(t('invalidAmount'));
    setBusy(true);
    try {
      const { data } = await api.post('/wallet/topup', { amount: value, provider: selectedProvider || undefined });
      if (!data.success && data.providerRef) {
        await api.get(`/wallet/topup/verify/${data.providerRef}`);
      }
      toast.success(t('toppedUp'));
      setAmount('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (balance === null) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 18 }}>{t('wallet')}</Title>

      <GoldCard style={{ alignItems: 'center', paddingVertical: 34, marginBottom: 16 }}>
        <T style={{ textAlign: 'center', fontSize: 14, fontFamily: fonts.medium, color: 'rgba(29,27,22,0.65)' }}>
          {t('currentBalance')}
        </T>
        <T style={{ fontFamily: fonts.black, fontSize: 34, color: colors.charcoal, marginTop: 8, textAlign: 'center' }}>
          {money(balance)}
        </T>
      </GoldCard>

      <Card style={{ gap: 12, marginBottom: 16 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{t('topUp')}</T>
        <Input placeholder={t('amountToman')} value={amount} onChangeText={setAmount} keyboardType="numeric" />
        <Row style={{ gap: 8 }}>
          {[100000, 200000, 500000].map((v) => (
            <Button key={v} small variant="ghost" title={money(v)} onPress={() => setAmount(String(v))} style={{ flex: 1 }} />
          ))}
        </Row>
        {paymentMethods.length > 1 && (
          <Row style={{ gap: 8, flexWrap: 'wrap' }}>
            {paymentMethods.map((m) => (
              <Chip
                key={m.name}
                icon="credit-card"
                label={m.label}
                active={selectedProvider === m.name}
                onPress={() => setSelectedProvider(m.name)}
              />
            ))}
          </Row>
        )}
        <Button title={busy ? t('paying') : t('payTopUp')} onPress={topUp} disabled={busy} />
      </Card>

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('recentTransactions')}</T>
      {transactions.length === 0 ? (
        <EmptyState icon="credit-card" title={t('noTransactions')} />
      ) : (
        transactions.map((tx) => (
          <Card key={tx.id} style={{ marginBottom: 10, paddingVertical: 14 }}>
            <Row between>
              <View style={{ flex: 1 }}>
                <T style={{ fontSize: 14, fontFamily: fonts.medium }}>{tx.description || tx.type}</T>
                <Muted style={{ fontSize: 12, marginTop: 3 }}>{date(tx.createdAt)}</Muted>
              </View>
              <T style={{ fontFamily: fonts.bold, color: Number(tx.amount) >= 0 ? colors.green : colors.red }}>
                {Number(tx.amount) >= 0 ? '+' : ''}
                {money(tx.amount)}
              </T>
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
