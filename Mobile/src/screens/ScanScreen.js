import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import api from '../api/client';
import { Button, EmptyState, Muted, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors } from '../theme';

export default function ScanScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <EmptyState icon="camera" title={t('scanWebOnly')} subtitle={t('scanWebOnlyHint')} />
      </View>
    );
  }

  if (!permission) return <View style={styles.center} />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <EmptyState icon="camera" title={t('cameraNeeded')} subtitle={t('cameraNeededHint')} />
        <Button title={t('enableCamera')} onPress={requestPermission} style={{ marginHorizontal: 40 }} />
      </View>
    );
  }

  async function handleScan({ data }) {
    if (busy) return;
    setBusy(true);
    try {
      const menuMatch = String(data).match(/\/menu\/([\w-]+)/);
      if (menuMatch) {
        const queryString = String(data).split('?')[1] || '';
        const tableMatch = queryString.match(/(?:^|&)table=([^&]+)/);
        const tableId = tableMatch ? decodeURIComponent(tableMatch[1]) : null;
        router.push({ pathname: `/venue/${menuMatch[1]}`, params: tableId ? { tableId } : {} });
        return;
      }
      const token = String(data).split('?')[0].split('/').filter(Boolean).pop();
      const { data: resolved } = await api.get(`/venues/resolve-qr/${token}`);
      if (resolved.venueId || resolved.venue?.id) {
        toast.success(t('tableFound'));
        const venueId = resolved.venueId || resolved.venue.id;
        const tableId = resolved.tableId || resolved.table?.id;
        router.push({ pathname: `/venue/${venueId}`, params: tableId ? { tableId } : {} });
      } else {
        toast.error(t('invalidQr'));
      }
    } catch {
      toast.error(t('qrNotRecognized'));
    } finally {
      setTimeout(() => setBusy(false), 1500);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {isFocused && (
        <CameraView
          style={{ flex: 1 }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleScan}
        />
      )}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Title style={{ marginTop: 20, textAlign: 'center' }}>{t('scanTitle')}</Title>
        <Muted style={{ textAlign: 'center', marginTop: 6 }}>{t('scanHint')}</Muted>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: colors.gold300,
    borderRadius: 32,
    backgroundColor: 'transparent',
  },
});
