import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Input, Loading, Muted, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

export default function VenueTaxSettingsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/venues/${user.venueId}`);
      setForm({
        economicCode: data.economicCode || '',
        legalName: data.legalName || '',
        nationalId: data.nationalId || '',
        postalCode: data.postalCode || '',
      });
    } catch {
      setForm({ economicCode: '', legalName: '', nationalId: '', postalCode: '' });
    }
  }, [user.venueId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!form) return <Loading />;

  async function save() {
    setBusy(true);
    try {
      await api.patch(`/venues/${user.venueId}`, form);
      toast.success(t('profileSaved'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 8 }}>{t('taxInfo')}</T>
      <Muted style={{ fontSize: 12, marginBottom: 14 }}>{t('taxInfoHint')}</Muted>

      <Card style={{ gap: 10 }}>
        <Input
          placeholder={t('economicCode')}
          value={form.economicCode}
          onChangeText={(v) => setForm((f) => ({ ...f, economicCode: v }))}
        />
        <Input
          placeholder={t('legalName')}
          value={form.legalName}
          onChangeText={(v) => setForm((f) => ({ ...f, legalName: v }))}
        />
        <Input
          placeholder={t('nationalId')}
          value={form.nationalId}
          onChangeText={(v) => setForm((f) => ({ ...f, nationalId: v }))}
        />
        <Input
          placeholder={t('postalCode')}
          value={form.postalCode}
          onChangeText={(v) => setForm((f) => ({ ...f, postalCode: v }))}
        />
        <Button title={busy ? t('loading') : t('save')} onPress={save} disabled={busy} />
      </Card>
    </ScrollView>
  );
}
