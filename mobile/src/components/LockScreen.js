import { View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';
import { Button, Icon, Muted, T } from './UI';

export function LockScreen() {
  const { unlock } = useAuth();
  const { t } = useI18n();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 28,
          backgroundColor: colors.surfaceHigh,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Icon name="lock" size={32} color={colors.gold300} />
      </View>
      <T style={{ fontFamily: fonts.black, fontSize: 18, textAlign: 'center' }}>{t('appLocked')}</T>
      <Muted style={{ marginTop: 6, textAlign: 'center' }}>{t('appLockedHint')}</Muted>
      <Button
        icon="unlock"
        title={t('unlockNow')}
        onPress={unlock}
        style={{ marginTop: 24, alignSelf: 'stretch', marginHorizontal: 24 }}
      />
    </View>
  );
}
