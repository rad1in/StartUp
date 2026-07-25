import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Icon, Input, Muted, Row, T, Title } from '../components/UI';
import HCaptchaModal from '../components/HCaptchaModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCaptcha } from '../hooks/useCaptcha';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { register } = useAuth();
  const toast = useToast();
  const captcha = useCaptcha();
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', referralCode: '' });
  const [busy, setBusy] = useState(false);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // On web a modal route can be entered with no history behind it (direct
  // link, reload); router.back() would then do nothing, stranding the user.
  function dismissOrGoHome() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function submit() {
    if (!form.name || !form.email || !form.password) {
      return toast.error(t('fillNameEmailPass'));
    }
    if (captcha.enabled && !captcha.token) return setCaptchaModalOpen(true);
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        referralCode: form.referralCode.trim() || undefined,
        captchaToken: captcha.token,
      });
      toast.success(t('welcome'));
      dismissOrGoHome();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 40 }}>
        <View style={{ alignItems: 'center', marginBottom: 28 }}>
          <View style={styles.logoMark}>
            <Icon name="user-plus" size={26} color={colors.gold300} />
          </View>
          <Title style={{ marginTop: 16, textAlign: 'center' }}>{t('createAccount')}</Title>
          <Muted style={{ marginTop: 6, textAlign: 'center', fontSize: 14 }}>{t('registerSubtitle')}</Muted>
        </View>

        <Card gold style={{ gap: 14 }}>
          <Input placeholder={t('fullName')} value={form.name} onChangeText={set('name')} />
          <Input placeholder={t('email')} value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
          <Input placeholder={t('phoneOptional')} value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
          <Input placeholder={t('password')} value={form.password} onChangeText={set('password')} secureTextEntry />
          <Input placeholder={t('referralPlaceholder')} value={form.referralCode} onChangeText={set('referralCode')} autoCapitalize="none" />
          {captcha.enabled && (
            <Button
              title={captcha.token ? t('captchaVerified') : t('completeCaptcha')}
              variant={captcha.token ? 'ghost' : 'secondary'}
              onPress={() => setCaptchaModalOpen(true)}
              disabled={Boolean(captcha.token)}
            />
          )}
          <Button title={busy ? t('registering') : t('signUp')} onPress={submit} disabled={busy} />
        </Card>

        <Row style={{ justifyContent: 'center', marginTop: 18, gap: 6 }}>
          <Muted>{t('haveAccount')}</Muted>
          <T style={{ color: colors.gold300, fontFamily: fonts.bold }} onPress={() => router.replace('/login')}>
            {t('login')}
          </T>
        </Row>
      </ScrollView>

      <HCaptchaModal
        visible={captchaModalOpen}
        siteKey={captcha.siteKey}
        onVerify={captcha.setToken}
        onClose={() => setCaptchaModalOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  logoMark: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
