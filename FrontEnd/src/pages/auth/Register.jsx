import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, Coffee, Mail, Lock, Eye, EyeOff, User, Phone, Gift } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useSelfCaptcha } from '../../hooks/useSelfCaptcha';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import SelfCaptchaModal from '../../components/SelfCaptchaModal';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const captcha = useSelfCaptcha();
  const { t } = useLanguage();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await captcha.guarded((extra) => register({ ...form, referralCode, ...extra }));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || t('register.genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto pt-10 animate-rise-in">
      <div className="text-center mb-8 relative">
        <div className="pointer-events-none absolute -z-10 left-1/2 -translate-x-1/2 -top-6 w-64 h-40 rounded-full bg-accent-500/20 blur-[70px]" />
        <span className="inline-flex w-[68px] h-[68px] rounded-[1.35rem] bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 items-center justify-center shadow-gold-glow ring-1 ring-accent-300/30 mb-4">
          <Coffee size={32} />
        </span>
        <h2 className="heading-display text-display-sm text-ink">{t('register.welcome')}</h2>
        <p className="text-ink/55 mt-2.5">{t('register.subtitle')}</p>
        {referralCode && (
          <p className="mt-3 chip-gold inline-flex items-center gap-1.5"><Gift size={14} />{t('register.referralBadge')}</p>
        )}
      </div>

      <Card className="rounded-[1.75rem] p-7">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">{t('register.fullName')}</label>
            <div className="icon-field">
              <User size={17} className="text-ink/35 shrink-0" />
              <input
                placeholder={t('register.fullNamePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>
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
            <label className="block text-sm font-bold text-ink mb-1.5">
              {t('auth.phoneNumber')} <span className="text-ink/35 font-normal text-xs">{t('register.phoneOptional')}</span>
            </label>
            <div className="icon-field">
              <Phone size={17} className="text-ink/35 shrink-0" />
              <input
                inputMode="tel"
                placeholder="۰۹۱۲..."
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">{t('auth.password')}</label>
            <div className="icon-field">
              <Lock size={17} className="text-ink/35 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('register.passwordPlaceholder')}
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
          {error && (
            <p className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 font-medium text-sm animate-pop-in">
              <XCircle size={14} className="shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" className="w-full py-3" disabled={loading}>
            {loading ? t('register.creating') : t('register.submit')}
          </Button>
        </form>
        <p className="text-sm text-ink/50 mt-5 text-center">
          {t('register.alreadyHaveAccount')}{' '}
          <Link to="/login" className="text-accent-700 font-bold hover:text-accent-600 transition-colors">
            {t('register.loginNow')}
          </Link>
        </p>
        <p className="text-xs text-ink/40 mt-3 text-center">
          {t('register.consentPrefix')} <Link to="/terms" className="text-ink/60 hover:text-ink">{t('footer.terms')}</Link> {t('register.consentAnd')}{' '}
          <Link to="/privacy" className="text-ink/60 hover:text-ink">{t('footer.privacy')}</Link>.
        </p>
      </Card>
      <SelfCaptchaModal challenge={captcha.challenge} onSolved={captcha.onSolved} onCancel={captcha.onCancel} />
    </div>
  );
}
