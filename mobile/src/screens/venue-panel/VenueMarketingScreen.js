import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card, Chip, EmptyState, GoldCard, Input, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const STATUS_COLOR = {
  PENDING: colors.gold300,
  APPROVED: colors.ink,
  REJECTED: colors.red,
  SENT: colors.green,
  FAILED: colors.red,
};

export default function VenueMarketingScreen() {
  const { user } = useAuth();
  const { t, money, date } = useI18n();
  const toast = useToast();
  const [credit, setCredit] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [alsoSendEmail, setAlsoSendEmail] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: creditData }, { data: campaignData }] = await Promise.all([
        api.get(`/venues/${user.venueId}/sms-campaigns/credit`),
        api.get(`/venues/${user.venueId}/sms-campaigns`),
      ]);
      setCredit(creditData.balance);
      setCampaigns(campaignData);
    } catch {
      setCredit(0);
      setCampaigns([]);
    }
  }, [user.venueId]);

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

  async function createCampaign() {
    if (!title || !message) return toast.error(t('smsCampaignFieldsRequired'));
    setBusy(true);
    try {
      await api.post(`/venues/${user.venueId}/sms-campaigns`, { title, message, alsoSendEmail });
      setTitle('');
      setMessage('');
      setAlsoSendEmail(false);
      toast.success(t('smsCampaignSubmitted'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function topUp() {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return toast.error(t('invalidAmount'));
    setBusy(true);
    try {
      const { data } = await api.post(`/venues/${user.venueId}/sms-campaigns/credit/topup`, {
        amount,
        provider: selectedProvider || undefined,
      });
      if (data.success) {
        setCredit(data.balance);
        setTopUpAmount('');
        toast.success(t('toppedUp'));
      } else if (data.redirectUrl) {
        await WebBrowser.openBrowserAsync(data.redirectUrl);
        try {
          await api.get(`/sms-credit/verify/${data.providerRef}`);
        } catch {
          /* best-effort */
        }
        load();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (credit === null) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 14 }}>{t('smsCampaigns')}</T>

      <GoldCard style={{ alignItems: 'center', paddingVertical: 26, marginBottom: 16 }}>
        <T style={{ fontSize: 13, fontFamily: fonts.medium, color: 'rgba(29,27,22,0.65)' }}>{t('smsCredit')}</T>
        <T style={{ fontFamily: fonts.black, fontSize: 28, color: colors.charcoal, marginTop: 6 }}>{money(credit)}</T>
      </GoldCard>

      <Card style={{ gap: 10, marginBottom: 16 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('topUpSmsCredit')}</T>
        <Input placeholder={t('amountToman')} value={topUpAmount} onChangeText={setTopUpAmount} keyboardType="numeric" />
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
        <Button title={busy ? t('paying') : t('chargeCredit')} onPress={topUp} disabled={busy} />
      </Card>

      <Card style={{ gap: 10, marginBottom: 16 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('newSmsCampaign')}</T>
        <Muted style={{ fontSize: 12 }}>{t('smsCampaignHint')}</Muted>
        <Input placeholder={t('smsCampaignTitle')} value={title} onChangeText={setTitle} />
        <Input
          placeholder={t('smsCampaignMessage')}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
        />
        <Row between>
          <T style={{ fontSize: 13, flex: 1 }}>{t('alsoSendEmail')}</T>
          <Switch
            value={alsoSendEmail}
            onValueChange={setAlsoSendEmail}
            trackColor={{ true: colors.gold300, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Row>
        <Button title={busy ? t('paying') : t('submitCampaign')} onPress={createCampaign} disabled={busy} />
      </Card>

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 10 }}>{t('campaignHistory')}</T>
      {campaigns.length === 0 ? (
        <EmptyState icon="message-circle" title={t('noSmsCampaigns')} />
      ) : (
        campaigns.map((c) => (
          <Card key={c.id} style={{ marginBottom: 10 }}>
            <Row between>
              <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{c.title}</T>
              <T style={{ fontFamily: fonts.medium, fontSize: 11, color: STATUS_COLOR[c.status] }}>
                {t(`smsStatus${c.status}`)}
              </T>
            </Row>
            <T style={{ fontSize: 13, marginTop: 6 }}>{c.message}</T>
            <Muted style={{ fontSize: 11, marginTop: 6 }}>
              {t('recipients')}: {c.recipientCount} — {t('cost')}: {money(c.totalCost)}
            </Muted>
            {c.status === 'REJECTED' && c.rejectionReason ? (
              <Muted style={{ fontSize: 11, marginTop: 4, color: colors.red }}>{c.rejectionReason}</Muted>
            ) : null}
            <Muted style={{ fontSize: 10, marginTop: 4 }}>{date(c.createdAt)}</Muted>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
