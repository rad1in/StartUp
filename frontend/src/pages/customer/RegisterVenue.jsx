import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, Coffee, XCircle, CheckCircle, Sparkles, QrCode, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useCity } from '../../context/CityContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const BENEFITS = [
  { icon: QrCode, text: 'منوی دیجیتال و سفارش با اسکن QR روی هر میز' },
  { icon: BarChart3, text: 'داشبورد فروش، حسابداری و گزارش لحظه‌ای' },
  { icon: Sparkles, text: 'دیده‌شدن کافه‌ات توسط مشتری‌های اطراف' },
];

// Self-service cafe registration: the customer fills basic info, the backend
// creates a PENDING venue and upgrades their role to VENUE_OWNER. Clicking
// through to the panel refreshes the session so the new role lands in the JWT.
export default function RegisterVenue() {
  const { refreshSession } = useAuth();
  const { city } = useCity();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', cuisineType: '', description: '', address: '', neighborhood: '', city: city?.name || 'تهران' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [entering, setEntering] = useState(false);

  function set(key) {
    return (e) => setForm({ ...form, [key]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/venues/register', form);
      setRegistered(true);
    } catch (err) {
      setError(err.response?.data?.message || 'ثبت کافه با خطا مواجه شد.');
    } finally {
      setSubmitting(false);
    }
  }

  async function enterPanel() {
    setEntering(true);
    try {
      await refreshSession();
      navigate('/venue');
    } catch {
      setEntering(false);
    }
  }

  if (registered) {
    return (
      <div className="max-w-md mx-auto pt-4 animate-fade-up">
        <Card className="rounded-3xl p-8 text-center space-y-4">
          <span className="inline-flex w-16 h-16 rounded-full bg-green-50 border border-green-200 text-green-600 items-center justify-center">
            <CheckCircle size={30} />
          </span>
          <h2 className="text-2xl font-black text-ink">کافه‌ات ثبت شد!</h2>
          <p className="text-sm text-ink/60 leading-relaxed">
            حساب شما به «مدیر کافه» ارتقا یافت. کافه پس از تأیید تیم پشتیبانی برای مشتریان نمایش داده می‌شود؛
            تا آن موقع می‌توانی منو، میزها و بقیه تنظیمات را از پنل مدیریت آماده کنی.
          </p>
          <Button className="w-full py-3" onClick={enterPanel} disabled={entering}>
            {entering ? 'در حال ورود...' : 'ورود به پنل مدیریت کافه'}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="text-center mb-6">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white items-center justify-center shadow-accent-glow mb-3">
          <Store size={26} />
        </span>
        <h2 className="text-2xl font-black text-ink">کافه‌ات رو ثبت کن</h2>
        <p className="text-sm text-ink/50 mt-1">چند فیلد ساده — بعدش پنل مدیریت کافه در اختیارته</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <div key={text} className="glass rounded-2xl p-3.5 flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-accent-50 border border-accent-200 text-accent-600 flex items-center justify-center shrink-0">
              <Icon size={15} />
            </span>
            <p className="text-xs text-ink/70 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-3xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">نام کافه *</label>
              <div className="icon-field">
                <Coffee size={17} className="text-ink/35 shrink-0" />
                <input placeholder="مثلاً کافه بهار" value={form.name} onChange={set('name')} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">نوع مجموعه</label>
              <div className="icon-field">
                <Store size={17} className="text-ink/35 shrink-0" />
                <input placeholder="کافه، رستوران، فست‌فود..." value={form.cuisineType} onChange={set('cuisineType')} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">آدرس *</label>
            <div className="icon-field">
              <MapPin size={17} className="text-ink/35 shrink-0" />
              <input placeholder="تهران، خیابان..." value={form.address} onChange={set('address')} required />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">شهر</label>
              <div className="icon-field">
                <input placeholder="تهران" value={form.city} onChange={set('city')} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink mb-1.5">محله</label>
              <div className="icon-field">
                <input placeholder="مثلاً ولیعصر" value={form.neighborhood} onChange={set('neighborhood')} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-ink mb-1.5">توضیح کوتاه درباره کافه</label>
            <textarea
              className="glass-input w-full rounded-xl px-4 py-3 text-sm min-h-[90px]"
              placeholder="فضای کافه، حال‌وهوا، چیزی که کافه‌ات رو خاص می‌کنه..."
              value={form.description}
              onChange={set('description')}
            />
          </div>

          {error && (
            <p className="flex items-center gap-1.5 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 font-medium text-sm animate-pop-in">
              <XCircle size={14} className="shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" variant="accent" className="w-full py-3" disabled={submitting}>
            {submitting ? 'در حال ثبت...' : 'ثبت کافه و ارتقای حساب'}
          </Button>
          <p className="text-xs text-ink/40 text-center">
            با ثبت کافه، حساب شما به «مدیر کافه» ارتقا می‌یابد و به پنل مدیریت دسترسی خواهید داشت.
          </p>
        </form>
      </Card>
    </div>
  );
}
