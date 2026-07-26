import { useState } from 'react';
import { CheckCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useCaptcha } from '../../hooks/useCaptcha';
import Card from '../../components/Card';
import Button from '../../components/Button';
import HCaptcha from '../../components/HCaptcha';
import { resolveImageUrl } from '../../components/VenueCards';
import { useLanguage } from '../../context/LanguageContext';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const captcha = useCaptcha();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    isProfilePublic: !!user?.isProfilePublic,
    smsMarketingOptOut: !!user?.smsMarketingOptOut,
    emailMarketingOptOut: !!user?.emailMarketingOptOut,
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverFile, setCoverFile] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [phone, setPhone] = useState(user?.phone || '');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState('');

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSaved(false);
    setError('');
    try {
      await api.patch('/customers/profile', {
        name: form.name,
        username: form.username,
        bio: form.bio,
        isProfilePublic: form.isProfilePublic,
        smsMarketingOptOut: form.smsMarketingOptOut,
        emailMarketingOptOut: form.emailMarketingOptOut,
      });
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.message || t('profile.saveError'));
    }
  }

  async function handleAvatarUpload() {
    if (!avatarFile) return;
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      await api.post('/customers/avatar', formData);
      await refreshUser();
      setAvatarFile(null);
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleCoverUpload() {
    if (!coverFile) return;
    setCoverUploading(true);
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      await api.post('/customers/cover', formData);
      await refreshUser();
      setCoverFile(null);
    } finally {
      setCoverUploading(false);
    }
  }

  async function requestOtp() {
    setOtpMessage('');
    if (captcha.enabled && !captcha.token) {
      setOtpMessage(t('profile.captchaRequired'));
      return;
    }
    await api.post('/auth/otp/request', { phone, captchaToken: captcha.token });
    setOtpSent(true);
  }

  async function verifyOtp(e) {
    e.preventDefault();
    setOtpMessage('');
    try {
      await api.post('/auth/otp/verify', { phone, code: otpCode });
      await refreshUser();
      setOtpMessage(t('profile.phoneVerified'));
      setOtpSent(false);
      setOtpCode('');
    } catch (err) {
      setOtpMessage(err.response?.data?.message || t('profile.invalidOtp'));
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMessage('');
    try {
      await api.post('/auth/change-password', passwordForm);
      setPasswordMessage(t('profile.passwordChanged'));
      setPasswordForm({ currentPassword: '', newPassword: '' });
    } catch (err) {
      setPasswordMessage(err.response?.data?.message || t('profile.passwordChangeError'));
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div className="flex items-start gap-2 text-xs text-ink/45 bg-primary-50/50 border border-dashed border-primary-200 rounded-xl px-3 py-2.5">
        <Sparkles size={14} className="text-accent-600 shrink-0 mt-0.5" />
        <span>
          {t('profile.socialNote')}
        </span>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="relative h-32 bg-gray-100">
          {user?.coverImageUrl ? (
            <img src={resolveImageUrl(user.coverImageUrl)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary-100 to-accent-100" />
          )}
          <img
            src={user?.avatarUrl ? resolveImageUrl(user.avatarUrl) : undefined}
            alt=""
            className="absolute -bottom-8 right-5 w-20 h-20 rounded-2xl border-4 border-white object-cover bg-gray-200 shadow-lg"
            style={{ display: user?.avatarUrl ? 'block' : 'none' }}
          />
          {!user?.avatarUrl && (
            <div className="absolute -bottom-8 right-5 w-20 h-20 rounded-2xl border-4 border-white bg-gray-200 shadow-lg flex items-center justify-center text-gray-400 text-xs">
              {t('profile.noImage')}
            </div>
          )}
        </div>
        <div className="pt-10 px-4 pb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('profile.avatarLabel')}</label>
            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files[0])} className="text-xs w-full" />
            <Button className="mt-2 w-full text-xs px-3 py-1.5" onClick={handleAvatarUpload} disabled={!avatarFile || avatarUploading}>
              {avatarUploading ? t('account.uploading') : t('account.upload')}
            </Button>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('profile.coverLabel')}</label>
            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files[0])} className="text-xs w-full" />
            <Button variant="secondary" className="mt-2 w-full text-xs px-3 py-1.5" onClick={handleCoverUpload} disabled={!coverFile || coverUploading}>
              {coverUploading ? t('account.uploading') : t('account.upload')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">{t('profile.infoTitle')}</h3>
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('profile.nameLabel')}</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={t('profile.nameLabel')}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('profile.usernameLabel')}</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
              <span className="px-3 text-gray-400 bg-gray-50 self-stretch flex items-center">@</span>
              <input
                className="flex-1 px-3 py-2 outline-none"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
                placeholder="username"
                dir="ltr"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('profile.usernameHint')}</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t('profile.bioLabel')}</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
              maxLength={280}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder={t('profile.bioPlaceholder')}
            />
            <p className="text-xs text-gray-400 mt-1 text-left">{form.bio.length}/280</p>
          </div>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100"
            value={user?.email || ''}
            disabled
          />
          <label className="flex items-center justify-between text-sm">
            <span>{t('profile.publicProfile')}</span>
            <input
              type="checkbox"
              checked={form.isProfilePublic}
              onChange={(e) => setForm({ ...form, isProfilePublic: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t('profile.smsMarketing')}</span>
            <input
              type="checkbox"
              checked={!form.smsMarketingOptOut}
              onChange={(e) => setForm({ ...form, smsMarketingOptOut: !e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span>{t('profile.emailMarketing')}</span>
            <input
              type="checkbox"
              checked={!form.emailMarketingOptOut}
              onChange={(e) => setForm({ ...form, emailMarketingOptOut: !e.target.checked })}
            />
          </label>
          {saved && <p className="flex items-center gap-1 text-ink font-medium text-sm"><CheckCircle size={14} />{t('profile.saveSuccess')}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit">{t('profile.saveButton')}</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">{t('profile.verifyPhoneTitle')}</h3>
        {user?.phoneVerifiedAt && user?.phone === phone ? (
          <p className="flex items-center gap-1 text-ink font-medium text-sm mb-3"><CheckCircle size={14} />{t('profile.phoneVerifiedPrefix')} {user.phone}</p>
        ) : (
          <p className="text-gray-500 text-sm mb-3">{t('profile.phoneNotVerified')}</p>
        )}
        <div className="space-y-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('profile.phonePlaceholder')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {!otpSent ? (
            <>
              {captcha.enabled && (
                <HCaptcha siteKey={captcha.siteKey} onVerify={captcha.setToken} onExpire={captcha.reset} />
              )}
              <Button variant="secondary" onClick={requestOtp} disabled={!phone}>
                {t('profile.sendOtp')}
              </Button>
            </>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-2">
              <input
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder={t('profile.otpPlaceholder')}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
              />
              <Button type="submit">{t('profile.verifyOtp')}</Button>
            </form>
          )}
          {otpMessage && <p className="text-sm text-gray-600">{otpMessage}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">{t('profile.changePasswordTitle')}</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('profile.currentPasswordPlaceholder')}
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
          />
          <input
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('profile.newPasswordPlaceholder')}
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
          />
          {passwordMessage && <p className="text-sm text-gray-600">{passwordMessage}</p>}
          <Button type="submit">{t('profile.changePasswordButton')}</Button>
        </form>
      </Card>
    </div>
  );
}
