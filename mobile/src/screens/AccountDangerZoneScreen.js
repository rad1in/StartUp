import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Muted, T } from '../components/UI';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function AccountDangerZoneScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const { logout } = useAuth();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(t('deleteAccountTitle'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccountFinal'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete('/customers/account');
            await logout();
            router.replace('/');
          } catch (err) {
            toast.error(err.response?.data?.message || t('orderFailed'));
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: 16, gap: 14 }}>
      <Card style={{ backgroundColor: colors.redBg }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 8, color: colors.red }}>{t('deleteAccountTitle')}</T>
        <Muted style={{ fontSize: 13, marginBottom: 14 }}>{t('deleteAccountHint')}</Muted>
        <Button variant="danger" title={deleting ? t('loading') : t('deleteAccount')} onPress={confirmDelete} disabled={deleting} />
      </Card>
    </View>
  );
}
