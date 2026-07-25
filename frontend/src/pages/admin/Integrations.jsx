import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';

const PROVIDER_LABELS = {
  mock: 'شبیه‌سازی (Mock)',
  aqayepardakht: 'آقای پرداخت',
  saman: 'سامان (SEP)',
  zarinpal: 'زرین‌پال',
  zibal: 'زیبال',
  payping: 'پی‌پینگ',
};

function ConfiguredBadge({ configured }) {
  return configured ? (
    <span className="text-ink font-bold inline-flex items-center gap-1"><Check size={12} />تنظیم شده</span>
  ) : (
    <span className="text-red-600 font-bold inline-flex items-center gap-1"><X size={12} />تنظیم نشده</span>
  );
}

function EnableToggle({ enabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`text-xs px-3 py-1.5 rounded-lg border font-bold ${
        enabled ? 'border-green-400 bg-green-50 text-green-800' : 'border-gray-300 bg-gray-50 text-gray-600'
      }`}
    >
      {enabled ? 'فعال — برای غیرفعال کردن کلیک کنید' : 'غیرفعال — برای فعال کردن کلیک کنید'}
    </button>
  );
}

export default function Integrations() {
  const [status, setStatus] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [samanTerminalInput, setSamanTerminalInput] = useState('');
  const [zarinpalMerchantInput, setZarinpalMerchantInput] = useState('');
  const [zibalMerchantInput, setZibalMerchantInput] = useState('');
  const [paypingTokenInput, setPaypingTokenInput] = useState('');
  const [melipayamakApiKeyInput, setMelipayamakApiKeyInput] = useState('');
  const [melipayamakFromInput, setMelipayamakFromInput] = useState('');
  const [smtpForm, setSmtpForm] = useState({ host: '', port: '', secure: false, user: '', pass: '', fromAddress: '', fromName: '' });
  const [captchaSiteKeyInput, setCaptchaSiteKeyInput] = useState('');
  const [captchaSecretKeyInput, setCaptchaSecretKeyInput] = useState('');
  const [gaIdInput, setGaIdInput] = useState('');

  async function refresh() {
    const { data } = await api.get('/admin/integrations');
    setStatus(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!status) return;
    setSmtpForm((prev) => ({
      ...prev,
      host: status.email.smtp.host,
      port: status.email.smtp.port,
      secure: status.email.smtp.secure,
      user: status.email.smtp.user,
      fromAddress: status.email.smtp.fromAddress,
      fromName: status.email.smtp.fromName,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.email?.smtp?.host]);

  useEffect(() => {
    if (!status) return;
    setCaptchaSiteKeyInput(status.captcha.siteKey || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.captcha?.siteKey]);

  useEffect(() => {
    if (!status) return;
    setGaIdInput(status.analytics.measurementId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.analytics?.measurementId]);

  async function patchPayment(payload) {
    await api.patch('/admin/integrations/payment', payload);
    refresh();
  }

  async function patchSms(payload) {
    await api.patch('/admin/integrations/sms', payload);
    refresh();
  }

  async function patchEmail(payload) {
    await api.patch('/admin/integrations/email', payload);
    refresh();
  }

  async function saveSmtp() {
    await patchEmail({
      smtpHost: smtpForm.host,
      smtpPort: smtpForm.port,
      smtpSecure: smtpForm.secure,
      smtpUser: smtpForm.user,
      smtpPass: smtpForm.pass || undefined,
      smtpFromAddress: smtpForm.fromAddress,
      smtpFromName: smtpForm.fromName,
    });
    setSmtpForm((f) => ({ ...f, pass: '' }));
  }

  async function patchCaptcha(payload) {
    await api.patch('/admin/integrations/captcha', payload);
    refresh();
  }

  async function saveCaptchaKeys() {
    await patchCaptcha({
      hcaptchaSiteKey: captchaSiteKeyInput,
      hcaptchaSecretKey: captchaSecretKeyInput || undefined,
    });
    setCaptchaSecretKeyInput('');
  }

  async function patchAnalytics(payload) {
    await api.patch('/admin/integrations/analytics', payload);
    refresh();
  }

  async function saveGaId() {
    await patchAnalytics({ measurementId: gaIdInput });
  }

  if (!status) return <p className="text-gray-500">در حال بارگذاری وضعیت یکپارچه‌سازی‌ها...</p>;

  const p = status.payment;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-1">درگاه‌های پرداخت</h3>
        <p className="text-xs text-gray-500 mb-4">
          چند درگاه را می‌توان همزمان فعال کرد — مشتری هنگام پرداخت از بین درگاه‌های فعال یکی را انتخاب می‌کند.
        </p>

        <div className="space-y-4">
          {/* Mock */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.mock}</span>
              <span className="text-xs text-gray-500">همیشه فعال — فقط برای محیط توسعه</span>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">نتیجه آزمایشی پرداخت</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
                value={p.mockOutcome}
                onChange={(e) => patchPayment({ mockOutcome: e.target.value })}
              >
                <option value="success">موفق</option>
                <option value="failure">ناموفق</option>
              </select>
            </div>
          </div>

          {/* AqayePardakht */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.aqayepardakht}</span>
              <EnableToggle enabled={p.aqayepardakht.enabled} onToggle={() => patchPayment({ aqayepardakhtEnabled: !p.aqayepardakht.enabled })} />
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">کد پین درگاه — <ConfiguredBadge configured={p.aqayepardakht.configured} /></label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                    placeholder="کد پین جدید را وارد کنید"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => { if (pinInput) { patchPayment({ aqayepardakhtPin: pinInput }); setPinInput(''); } }}
                    className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                  >
                    ذخیره
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">حالت</label>
                <button
                  type="button"
                  onClick={() => patchPayment({ aqayepardakhtSandbox: !p.aqayepardakht.sandbox })}
                  className={`w-full text-sm px-3 py-2 rounded-lg border ${
                    p.aqayepardakht.sandbox ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-green-400 bg-green-50 text-green-800'
                  }`}
                >
                  {p.aqayepardakht.sandbox ? 'آزمایشی (Sandbox)' : 'واقعی (Live)'}
                </button>
              </div>
            </div>
          </div>

          {/* Saman */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.saman}</span>
              <EnableToggle enabled={p.saman.enabled} onToggle={() => patchPayment({ samanEnabled: !p.saman.enabled })} />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">شناسه ترمینال (TerminalId) — <ConfiguredBadge configured={p.saman.configured} /></label>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  placeholder="شناسه ترمینال جدید را وارد کنید"
                  value={samanTerminalInput}
                  onChange={(e) => setSamanTerminalInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { if (samanTerminalInput) { patchPayment({ samanTerminalId: samanTerminalInput }); setSamanTerminalInput(''); } }}
                  className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>

          {/* ZarinPal */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.zarinpal}</span>
              <EnableToggle enabled={p.zarinpal.enabled} onToggle={() => patchPayment({ zarinpalEnabled: !p.zarinpal.enabled })} />
            </div>
            <div className="mt-3 grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">کد پذیرنده (Merchant ID) — <ConfiguredBadge configured={p.zarinpal.configured} /></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                    placeholder="کد پذیرنده جدید را وارد کنید"
                    value={zarinpalMerchantInput}
                    onChange={(e) => setZarinpalMerchantInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => { if (zarinpalMerchantInput) { patchPayment({ zarinpalMerchantId: zarinpalMerchantInput }); setZarinpalMerchantInput(''); } }}
                    className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                  >
                    ذخیره
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">حالت</label>
                <button
                  type="button"
                  onClick={() => patchPayment({ zarinpalSandbox: !p.zarinpal.sandbox })}
                  className={`w-full text-sm px-3 py-2 rounded-lg border ${
                    p.zarinpal.sandbox ? 'border-yellow-400 bg-yellow-50 text-yellow-800' : 'border-green-400 bg-green-50 text-green-800'
                  }`}
                >
                  {p.zarinpal.sandbox ? 'آزمایشی (Sandbox)' : 'واقعی (Live)'}
                </button>
              </div>
            </div>
          </div>

          {/* Zibal */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.zibal}</span>
              <EnableToggle enabled={p.zibal.enabled} onToggle={() => patchPayment({ zibalEnabled: !p.zibal.enabled })} />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">کد پذیرنده (Merchant) — <ConfiguredBadge configured={p.zibal.configured} /></label>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  placeholder="کد پذیرنده جدید را وارد کنید"
                  value={zibalMerchantInput}
                  onChange={(e) => setZibalMerchantInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { if (zibalMerchantInput) { patchPayment({ zibalMerchant: zibalMerchantInput }); setZibalMerchantInput(''); } }}
                  className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>

          {/* PayPing */}
          <div className="border border-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="font-bold text-sm text-gray-800">{PROVIDER_LABELS.payping}</span>
              <EnableToggle enabled={p.payping.enabled} onToggle={() => patchPayment({ paypingEnabled: !p.payping.enabled })} />
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">توکن دسترسی (Access Token) — <ConfiguredBadge configured={p.payping.configured} /></label>
              <div className="flex gap-2 max-w-md">
                <input
                  type="password"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  placeholder="توکن جدید را وارد کنید"
                  value={paypingTokenInput}
                  onChange={(e) => setPaypingTokenInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { if (paypingTokenInput) { patchPayment({ paypingAccessToken: paypingTokenInput }); setPaypingTokenInput(''); } }}
                  className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">پیامک / OTP</h3>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ارائه‌دهنده فعال</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
            value={status.sms.provider}
            onChange={(e) => patchSms({ provider: e.target.value })}
          >
            {status.sms.availableProviders.map((p2) => (
              <option key={p2} value={p2}>
                {p2}
              </option>
            ))}
          </select>
        </div>

        {status.sms.provider === 'melipayamak' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                کد اختصاصی (Token) — <ConfiguredBadge configured={status.sms.melipayamak.configured} />
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  placeholder="کد اختصاصی جدید را وارد کنید"
                  value={melipayamakApiKeyInput}
                  onChange={(e) => setMelipayamakApiKeyInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { if (melipayamakApiKeyInput) { patchSms({ melipayamakApiKey: melipayamakApiKeyInput }); setMelipayamakApiKeyInput(''); } }}
                  className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                >
                  ذخیره
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                همان کدی که در آدرس API متدهای ارسال (پس از send/) ظاهر می‌شود — برای OTP و پیامک‌های متنی مشترک است.
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">شماره خط ارسال (from)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
                  placeholder={status.sms.melipayamak.from || 'مثلاً 5000xxx'}
                  value={melipayamakFromInput}
                  onChange={(e) => setMelipayamakFromInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => { if (melipayamakFromInput) { patchSms({ melipayamakFrom: melipayamakFromInput }); setMelipayamakFromInput(''); } }}
                  className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
                >
                  ذخیره
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-1">ایمیل</h3>
        <p className="text-xs text-gray-500 mb-4">برای ارسال فیش، تایید سفارش و پیامک‌های بازاریابی از طریق ایمیل.</p>
        <div>
          <label className="block text-xs text-gray-500 mb-1">ارائه‌دهنده فعال</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-64"
            value={status.email.provider}
            onChange={(e) => patchEmail({ provider: e.target.value })}
          >
            {status.email.availableProviders.map((p2) => (
              <option key={p2} value={p2}>
                {p2 === 'mock' ? 'شبیه‌سازی (Mock)' : 'SMTP'}
              </option>
            ))}
          </select>
        </div>

        {status.email.provider === 'smtp' && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">آدرس سرور (Host)</label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="smtp.example.com"
                value={smtpForm.host}
                onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">پورت</label>
              <input
                type="number"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="587"
                value={smtpForm.port}
                onChange={(e) => setSmtpForm({ ...smtpForm, port: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">نام کاربری</label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                value={smtpForm.user}
                onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                رمز عبور — <ConfiguredBadge configured={status.email.smtp.configured} />
              </label>
              <input
                type="password"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="رمز جدید را وارد کنید"
                value={smtpForm.pass}
                onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">آدرس ایمیل فرستنده</label>
              <input
                type="email"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                placeholder="no-reply@yourdomain.com"
                value={smtpForm.fromAddress}
                onChange={(e) => setSmtpForm({ ...smtpForm, fromAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">نام فرستنده</label>
              <input
                type="text"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
                value={smtpForm.fromName}
                onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={smtpForm.secure}
                onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
              />
              اتصال با SSL/TLS (پورت 465)
            </label>
            <button
              type="button"
              onClick={saveSmtp}
              className="sm:col-span-2 px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
            >
              ذخیره تنظیمات SMTP
            </button>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-800">کپچا (hCaptcha)</h3>
          <EnableToggle enabled={status.captcha.enabled} onToggle={() => patchCaptcha({ enabled: !status.captcha.enabled })} />
        </div>
        <p className="text-xs text-gray-500 mb-4">
          برای صفحات ثبت‌نام، ورود و درخواست کد پیامک — جلوگیری از حملات bot و brute-force.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Site Key</label>
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              placeholder="Site Key از پنل hCaptcha"
              value={captchaSiteKeyInput}
              onChange={(e) => setCaptchaSiteKeyInput(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Secret Key — <ConfiguredBadge configured={status.captcha.configured} />
            </label>
            <input
              type="password"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
              placeholder="Secret Key جدید را وارد کنید"
              value={captchaSecretKeyInput}
              onChange={(e) => setCaptchaSecretKeyInput(e.target.value)}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={saveCaptchaKeys}
          className="mt-4 px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
        >
          ذخیره کلیدهای کپچا
        </button>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h3 className="font-semibold text-gray-800">تحلیل و آمار (Google Analytics 4)</h3>
          <EnableToggle enabled={status.analytics.enabled} onToggle={() => patchAnalytics({ enabled: !status.analytics.enabled })} />
        </div>
        <p className="text-xs text-gray-500 mb-4">
          ردیابی ترافیک ورودی و کمپین‌های تبلیغاتی — فقط پس از رضایت کاربر به کوکی‌ها روی وب فعال می‌شود.
        </p>
        <div className="max-w-md">
          <label className="block text-xs text-gray-500 mb-1">Measurement ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
              placeholder="مثلاً G-XXXXXXXXXX"
              value={gaIdInput}
              onChange={(e) => setGaIdInput(e.target.value)}
            />
            <button
              type="button"
              onClick={saveGaId}
              className="px-3 py-2 rounded-lg bg-primary-800 text-white text-sm"
            >
              ذخیره
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">نشان (Neshan) — نقشه و موقعیت‌یابی</h3>
        <p className="text-sm text-gray-700">
          وضعیت کلید API:{' '}
          <span className={status.neshan.configured ? 'text-ink font-bold' : 'text-ink/50 font-bold'}>
            {status.neshan.configured
              ? <span className="flex items-center gap-1"><Check size={13} />پیکربندی شده</span>
              : <span className="flex items-center gap-1"><X size={13} />پیکربندی نشده</span>}
          </span>
        </p>
        <p className="text-xs text-gray-500 mt-1">
          کلیدهای API از طریق متغیرهای محیطی سرور تنظیم می‌شوند و از این پنل قابل مشاهده یا ویرایش نیستند.
        </p>
      </Card>
    </div>
  );
}
