import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { XCircle, Coffee, Mail, Lock, Eye, EyeOff, Phone, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSelfCaptcha } from '../../hooks/useSelfCaptcha';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import GoogleSignInButton from '../../components/GoogleSignInButton';
import SelfCaptchaModal from '../../components/SelfCaptchaModal';

export default function Login() {
  const { login, requestLoginOtp, verifyLoginOtp, loginWithGoogle, completeTwoFactor } = useAuth();
  const navigate = useNavigate();
  const captcha = useSelfCaptcha();
  const { t } = useLanguage();

  const [method, setMethod] = useState('password'); // password | otp
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState({ otpLogin: true, googleLogin: true });

  useEffect(() => {
    api
      .get('/content/feature-flags')
      .then(({ data }) => setFlags(data))
      .catch(() => {});
  }, []);

  // password
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  // otp
  const [phone, setPhone] = useState('');
  const [otpStage, setOtpStage] = useState('phone'); // phone | code
  const [otpCode, setOtpCode] = useState('');

  // 2fa
  const [challengeToken, setChallengeToken] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const done = (result) => {
    if (result?.twoFactorRequired) {
      setChallengeToken(result.challengeToken);
      setError('');
      return;
    }
    navigate('/');
  };

  const wrap = async (fn) => {
    setError('');
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(err.response?.data?.message || t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const submitPassword = (e) => {
    e.preventDefault();
    wrap(async () => done(await captcha.guarded((extra) => login(form.email, form.password, extra))));
  };

  const sendOtp = (e) => {
    e.preventDefault();
    wrap(async () => {
      await captcha.guarded((extra) => requestLoginOtp(phone, extra));
      setOtpStage('code');
    });
  };

  const submitOtp = (e) => {
    e.preventDefault();
    wrap(async () => done(await verifyLoginOtp(phone, otpCode)));
  };

  const submitTwoFactor = (e) => {
    e.preventDefault();
    wrap(async () => done(await completeTwoFactor(challengeToken, twoFactorCode)));
  };

  const onGoogle = (idToken) => wrap(async () => done(await loginWithGoogle(idToken)));

  // --- 2FA challenge screen ---
  if (challengeToken) {
    return (
      <div className="max-w-sm mx-auto pt-10 animate-rise-in">
        <div className="text-center mb-8">
          <span className="inline-flex w-[68px] h-[68px] rounded-[1.35rem] bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 items-center justify-center shadow-gold-glow ring-1 ring-accent-300/30 mb-4">
            <ShieldCheck size={32} />
          </span>
          <h2 className="heading-display text-display-sm text-ink">{t('auth.twoFactorTitle')}</h2>
          <p className="text-ink/55 mt-2.5">{t('auth.twoFactorSubtitle')}</p>
        </div>
        <Card className="rounded-[1.75rem] p-7">
          <form onSubmit={submitTwoFactor} className="space-y-4">
            <input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              placeholder="------"
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              className="glass-input w-full rounded-xl px-4 py-3 text-center text-2xl font-black tracking-[0.4em]"
            />
            {error && <ErrorLine text={error} />}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3">
              {loading ? t('auth.checking') : t('auth.confirmAndLogin')}
            </button>
            <button type="button" onClick={() => setChallengeToken(null)} className="w-full text-sm text-ink/45 hover:text-ink">
              {t('auth.back')}
            </button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto pt-10 animate-rise-in">
      <div className="text-center mb-8 relative">
        {/* Soft gold bloom behind the mark, same device as the home hero. */}
        <div className="pointer-events-none absolute -z-10 left-1/2 -translate-x-1/2 -top-6 w-64 h-40 rounded-full bg-accent-500/20 blur-[70px]" />
        <span className="inline-flex w-[68px] h-[68px] rounded-[1.35rem] bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 items-center justify-center shadow-gold-glow ring-1 ring-accent-300/30 mb-4">
          <Coffee size={32} />
        </span>
        <h2 className="heading-display text-display-sm text-ink">{t('auth.welcomeBack')}</h2>
        <p className="text-ink/55 mt-2.5">{t('auth.loginSubtitle')}</p>
      </div>

      <Card className="rounded-[1.75rem] p-7">
        {/* Method switch */}
        <div className="flex gap-1 p-1 bg-black/[0.04] rounded-full mb-5">
          {[
            { key: 'password', label: t('auth.emailPassword'), icon: Lock },
            ...(flags.otpLogin ? [{ key: 'otp', label: t('auth.smsCode'), icon: Phone }] : []),
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => {
                setMethod(m.key);
                setError('');
                setOtpStage('phone');
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-sm font-bold transition-all ${
                method === m.key ? 'bg-white shadow-soft text-ink' : 'text-ink/50 hover:text-ink'
              }`}
            >
              <m.icon size={15} />
              {m.label}
            </button>
          ))}
        </div>

        {method === 'password' && (
          <form onSubmit={submitPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">{t('auth.email')}</label>
              <div className="icon-field">
                <Mail size={17} className="text-ink/35 shrink-0" />
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">{t('auth.password')}</label>
              <div className="icon-field">
                <Lock size={17} className="text-ink/35 shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="text-ink/35 hover:text-ink transition-colors shrink-0"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <input type="text" name="website" {...captcha.honeypotProps} />
            {error && <ErrorLine text={error} />}
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </Button>
          </form>
        )}

        {method === 'otp' && otpStage === 'phone' && (
          <form onSubmit={sendOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">{t('auth.phoneNumber')}</label>
              <div className="icon-field">
                <Phone size={17} className="text-ink/35 shrink-0" />
                <input
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <p className="text-[11px] text-ink/40 mt-1.5">{t('auth.phoneHint')}</p>
            </div>
            <input type="text" name="website" {...captcha.honeypotProps} />
            {error && <ErrorLine text={error} />}
            <Button type="submit" className="w-full py-3" disabled={loading}>
              {loading ? t('auth.sending') : t('auth.sendCode')}
            </Button>
          </form>
        )}

        {method === 'otp' && otpStage === 'code' && (
          <form onSubmit={submitOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">{t('auth.verificationCode')}</label>
              <div className="icon-field">
                <KeyRound size={17} className="text-ink/35 shrink-0" />
                <input
                  inputMode="numeric"
                  dir="ltr"
                  maxLength={6}
                  placeholder={t('auth.verificationCodePlaceholder')}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => { setOtpStage('phone'); setOtpCode(''); }}
                className="text-[11px] text-ink/45 hover:text-ink mt-1.5"
              >
                {t('auth.changeNumber')}
              </button>
            </div>
            {error && <ErrorLine text={error} />}
            <button type="submit" disabled={loading} className="btn-gold w-full py-3">
              {loading ? t('auth.checking') : t('auth.confirmAndLogin')}
            </button>
          </form>
        )}

        {/* Divider + Google */}
        {flags.googleLogin && (
          <>
            <div className="flex items-center gap-3 my-5">
              <span className="flex-1 h-px bg-black/10" />
              <span className="text-[11px] text-ink/40">{t('auth.or')}</span>
              <span className="flex-1 h-px bg-black/10" />
            </div>
            <GoogleSignInButton onCredential={onGoogle} />
          </>
        )}

        <p className="text-sm text-ink/50 mt-5 text-center">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-accent-700 font-bold hover:text-accent-600 transition-colors">
            {t('auth.registerNow')}
          </Link>
        </p>
      </Card>
      <SelfCaptchaModal challenge={captcha.challenge} onSolved={captcha.onSolved} onCancel={captcha.onCancel} />
    </div>
  );
}

function ErrorLine({ text }) {
  return (
    <p className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 font-medium text-sm animate-pop-in">
      <XCircle size={14} className="shrink-0" />
      {text}
    </p>
  );
}
