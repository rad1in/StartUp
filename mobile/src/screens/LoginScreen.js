import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Chip, Input, Muted, Row, T, Title } from '../components/UI';
import HCaptchaModal from '../components/HCaptchaModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useCaptcha } from '../hooks/useCaptcha';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { login, requestLoginOtp, loginWithOtp } = useAuth();
  const toast = useToast();
  const captcha = useCaptcha();
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [mode, setMode] = useState('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);

  // On web a modal route can be entered with no history behind it (direct
  // link, reload); router.back() would then do nothing, stranding the user.
  function dismissOrGoHome() {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  async function submitPassword() {
    if (!email || !password) return toast.error(t('fillEmailPass'));
    if (captcha.enabled && !captcha.token) return setCaptchaModalOpen(true);
    setBusy(true);
    try {
      const result = await login(email.trim(), password, captcha.token);
      if (result.accessToken) {
        toast.success(t('welcome'));
        dismissOrGoHome();
      } else if (result.twoFactorRequired || result.pendingTwoFactor) {
        toast.info(t('twoFaWeb'));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp() {
    setBusy(true);
    try {
      if (!otpSent) {
        if (!phone) return toast.error(t('phonePlaceholder'));
        if (captcha.enabled && !captcha.token) return setCaptchaModalOpen(true);
        await requestLoginOtp(phone.trim(), captcha.token);
        setOtpSent(true);
        toast.success(t('codeSent'));
      } else {
        if (!code) return toast.error(t('otpPlaceholder'));
        const result = await loginWithOtp(phone.trim(), code.trim());
        if (result.accessToken) {
          toast.success(t('welcome'));
          dismissOrGoHome();
        }
      }
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
            <Image source={require('../../assets/icon.png')} style={styles.logoImg} />
          </View>
          <Title style={{ marginTop: 16, textAlign: 'center' }}>{t('welcomeBack')}</Title>
          <Muted style={{ marginTop: 6, textAlign: 'center', fontSize: 14 }}>{t('loginSubtitle')}</Muted>
        </View>

        <Row style={{ justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          <Chip label={t('emailPass')} active={mode === 'password'} onPress={() => setMode('password')} />
          <Chip label={t('smsCode')} active={mode === 'otp'} onPress={() => setMode('otp')} />
        </Row>

        <Card gold style={{ gap: 14 }}>
          {mode === 'password' ? (
            <>
              <Input placeholder={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              <Input placeholder={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
              <Button title={busy ? t('loggingIn') : t('login')} onPress={submitPassword} disabled={busy} />
            </>
          ) : (
            <>
              <Input placeholder={t('phonePlaceholder')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" editable={!otpSent} />
              {otpSent && <Input placeholder={t('otpPlaceholder')} value={code} onChangeText={setCode} keyboardType="number-pad" />}
              <Button title={busy ? t('loading') : otpSent ? t('verifyCode') : t('sendCode')} onPress={submitOtp} disabled={busy} />
              {otpSent && (
                <Button
                  title={t('changeNumber')}
                  variant="ghost"
                  onPress={() => {
                    setOtpSent(false);
                    setCode('');
                  }}
                />
              )}
            </>
          )}
          {captcha.enabled && (
            <Button
              title={captcha.token ? t('captchaVerified') : t('completeCaptcha')}
              variant={captcha.token ? 'ghost' : 'secondary'}
              onPress={() => setCaptchaModalOpen(true)}
              disabled={Boolean(captcha.token)}
            />
          )}
        </Card>

        <Row style={{ justifyContent: 'center', marginTop: 18, gap: 6 }}>
          <Muted>{t('noAccount')}</Muted>
          <T style={{ color: colors.gold300, fontFamily: fonts.bold }} onPress={() => router.replace('/register')}>
            {t('signUp')}
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
    overflow: 'hidden',
  },
  logoImg: { width: '100%', height: '100%' },
});
