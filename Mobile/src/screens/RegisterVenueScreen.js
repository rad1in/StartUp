import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Icon, Input, Muted, Row, T, Title } from '../components/UI';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

const BENEFITS = ['registerVenueBenefit1', 'registerVenueBenefit2', 'registerVenueBenefit3'];

export default function RegisterVenueScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ name: '', cuisineType: '', description: '', address: '', neighborhood: '', city: '' });
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [entering, setEntering] = useState(false);

  function set(key) {
    return (v) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function submit() {
    if (!form.name || !form.address) return;
    setSubmitting(true);
    try {
      await api.post('/venues/register', form);
      setRegistered(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('registerVenueFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function enterPanel() {
    setEntering(true);
    try {
      await refreshUser();
      router.replace('/admin-panel');
    } catch {
      setEntering(false);
    }
  }

  if (registered) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.greenBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Icon name="check-circle" size={32} color={colors.green} />
        </View>
        <T style={{ fontFamily: fonts.black, fontSize: 19, textAlign: 'center' }}>{t('venueRegisteredTitle')}</T>
        <Muted style={{ marginTop: 8, textAlign: 'center', paddingHorizontal: 12 }}>{t('venueRegisteredHint')}</Muted>
        <Button
          title={entering ? t('loading') : t('enterVenuePanel')}
          onPress={enterPanel}
          disabled={entering}
          style={{ marginTop: 24, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 8 }}>{t('registerVenueTitle')}</Title>
      <Muted style={{ marginBottom: 20, fontSize: 14 }}>{t('registerVenueSubtitle')}</Muted>

      <Row style={{ gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {BENEFITS.map((key, i) => (
          <Card key={key} style={{ flexBasis: '31%', flexGrow: 1, paddingVertical: 14, paddingHorizontal: 12 }}>
            <Icon
              name={['grid', 'bar-chart-2', 'map-pin'][i]}
              size={16}
              color={colors.gold300}
              style={{ marginBottom: 8 }}
            />
            <T style={{ fontSize: 12, lineHeight: 17 }}>{t(key)}</T>
          </Card>
        ))}
      </Row>

      <Card>
        <Input placeholder={t('venueNamePlaceholder')} value={form.name} onChangeText={set('name')} style={{ marginBottom: 10 }} />
        <Input
          placeholder={t('venueCuisinePlaceholder')}
          value={form.cuisineType}
          onChangeText={set('cuisineType')}
          style={{ marginBottom: 10 }}
        />
        <Input
          placeholder={t('venueAddressPlaceholder')}
          value={form.address}
          onChangeText={set('address')}
          style={{ marginBottom: 10 }}
        />
        <Row style={{ gap: 10, marginBottom: 10 }}>
          <Input placeholder={t('venueCityPlaceholder')} value={form.city} onChangeText={set('city')} style={{ flex: 1 }} />
          <Input
            placeholder={t('venueNeighborhoodPlaceholder')}
            value={form.neighborhood}
            onChangeText={set('neighborhood')}
            style={{ flex: 1 }}
          />
        </Row>
        <Input
          placeholder={t('venueDescriptionPlaceholder')}
          value={form.description}
          onChangeText={set('description')}
          multiline
          numberOfLines={3}
          style={{ marginBottom: 14 }}
        />

        <Button
          title={submitting ? t('loading') : t('submitVenueRegistration')}
          onPress={submit}
          disabled={submitting || !form.name || !form.address}
        />
        <Muted style={{ fontSize: 11, textAlign: 'center', marginTop: 10 }}>{t('registerVenueUpgradeHint')}</Muted>
      </Card>
    </ScrollView>
  );
}
