import { useEffect, useState } from 'react';
import { Check, X, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useAuth } from '../../hooks/useAuth';

// type: 'bool' = Check/X icon, 'text' = plain string, 'rootBool' = bool but reads from plan root not features
const FEATURE_ROWS = [
  { key: 'commissionRate', label: 'کارمزد هر تراکنش', type: 'root', format: (v) => `${(v * 100).toFixed(0)}٪` },
  { key: 'monthlyPrice',   label: 'قیمت ماهانه (تومان)', type: 'root', format: (v) => v === 0 ? 'رایگان' : Number(v).toLocaleString('fa-IR') },
  { key: 'maxMenuItems',   label: 'آیتم‌های منو',        type: 'text', format: (v) => v == null ? 'نامحدود' : `حداکثر ${v}` },
  { key: 'multiBranch',    label: 'چند شعبه',            type: 'bool', highlight: true },
  { key: 'inventoryTracking', label: 'مدیریت انبار',    type: 'bool', highlight: true },
  { key: 'aiForecasting',  label: 'پیش‌بینی هوش مصنوعی', type: 'bool', highlight: true },
  { key: 'advancedAnalytics', label: 'گزارش‌های پیشرفته', type: 'bool' },
  { key: 'apiAccess',      label: 'دسترسی API',           type: 'bool' },
  { key: 'supportLevel',   label: 'پشتیبانی',             type: 'text', format: (v) => ({ email: 'ایمیل', priority: 'اولویت‌دار', dedicated: 'اختصاصی ۲۴/۷' }[v] || v) },
  { key: 'trialEligible',  label: 'دوره آزمایشی',         type: 'bool', trueText: 'تا ۷ روز' },
];

const TIER_COLORS = {
  FREE:  { ring: '', badge: 'bg-gray-100 text-gray-700',     button: 'border border-gray-300 text-gray-700 hover:bg-gray-50' },
  PRO:   { ring: 'ring-2 ring-primary-500', badge: 'bg-primary-100 text-primary-700', button: 'bg-primary-600 text-white hover:bg-primary-700' },
  ULTRA: { ring: 'ring-2 ring-purple-500',  badge: 'bg-purple-100 text-purple-700',   button: 'bg-purple-600 text-white hover:bg-purple-700' },
};

function formatPrice(amount) {
  if (!amount || amount === 0) return 'رایگان';
  return `${Number(amount).toLocaleString('fa-IR')} تومان`;
}

export default function Pricing() {
  const { user } = useAuth();
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState('monthly');
  const [monthlyRevenue, setMonthlyRevenue] = useState('');
  const [loading, setLoading] = useState(true);
  const [trialTier, setTrialTier] = useState('');
  const [trialForm, setTrialForm] = useState({ phone: '', businessId: '', bankAccount: '' });
  const [trialStatus, setTrialStatus] = useState(null);
  const [trialMsg, setTrialMsg] = useState('');

  useEffect(() => {
    api.get('/plans').then(({ data }) => setPlans(data)).finally(() => setLoading(false));
    if (user?.role === 'VENUE_OWNER' && user?.venueId) {
      api.get(`/plans/venue/${user.venueId}/trial`).then(({ data }) => setTrialStatus(data)).catch(() => {});
    }
  }, [user]);

  function getDisplayPrice(plan) {
    if (billing === 'yearly' && plan.yearlyPrice > 0) {
      return { price: plan.yearlyPrice / 12, suffix: '/ماه (تسویه سالانه)', savings: plan.monthlyPrice * 12 - plan.yearlyPrice };
    }
    return { price: plan.monthlyPrice, suffix: '/ماه', savings: 0 };
  }

  // Cost estimator
  const revenue = parseFloat(monthlyRevenue) || 0;
  const estimations = plans.map((plan) => {
    const displayPrice = getDisplayPrice(plan);
    const commission = revenue * plan.commissionRate;
    const fixed = displayPrice.price;
    const total = commission + fixed;
    const yearlyTotal = billing === 'yearly' && plan.yearlyPrice > 0
      ? revenue * plan.commissionRate * 12 + plan.yearlyPrice
      : total * 12;
    return { ...plan, commission, fixed, total, yearlyTotal };
  });
  const cheapest = revenue > 0 ? estimations.reduce((a, b) => a.total < b.total ? a : b) : null;

  async function startTrial(tier) {
    setTrialMsg('');
    try {
      await api.post(`/plans/venue/${user.venueId}/trial`, { tier, ...trialForm });
      setTrialMsg('دوره آزمایشی با موفقیت آغاز شد!');
      const { data } = await api.get(`/plans/venue/${user.venueId}/trial`);
      setTrialStatus(data);
      setTrialTier('');
    } catch (err) {
      setTrialMsg(err.response?.data?.message || 'خطا در شروع دوره آزمایشی.');
    }
  }

  if (loading) return <p className="text-center text-gray-400 py-12">در حال بارگذاری تعرفه‌ها...</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">تعرفه‌های اشتراک</h1>
        <p className="text-gray-500">پلتفرم کمیسیون-محور — فقط به ازای هر تراکنش موفق هزینه پرداخت کنید.</p>

        {/* Monthly / Yearly toggle */}
        <div className="inline-flex bg-gray-100 rounded-xl p-1 mt-4">
          {[{ id: 'monthly', label: 'ماهانه' }, { id: 'yearly', label: 'سالانه (۱۶٪ تخفیف)' }].map((b) => (
            <button key={b.id} onClick={() => setBilling(b.id)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${billing === b.id ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const { price, suffix, savings } = getDisplayPrice(plan);
          const colors = TIER_COLORS[plan.tier] || TIER_COLORS.FREE;
          return (
            <Card key={plan.tier} className={`relative flex flex-col ${colors.ring}`}>
              {plan.tier === 'PRO' && (
                <span className="absolute -top-3 right-4 bg-primary-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">پیشنهادی</span>
              )}
              <div className="mb-4">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.badge}`}>{plan.name}</span>
                <div className="mt-3">
                  <span className="text-3xl font-extrabold text-gray-900">{(plan.commissionRate * 100).toFixed(0)}٪</span>
                  <span className="text-sm text-gray-500 mr-1">کارمزد</span>
                </div>
                {plan.monthlyPrice > 0 && (
                  <div className="mt-1">
                    <span className="text-lg font-bold text-gray-700">{formatPrice(price)}</span>
                    <span className="text-xs text-gray-400 mr-1">{suffix}</span>
                    {savings > 0 && billing === 'yearly' && (
                      <p className="text-xs text-green-600 mt-0.5">صرفه‌جویی {Number(savings).toLocaleString('fa-IR')} تومان در سال</p>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-1.5 text-sm flex-1">
                {FEATURE_ROWS.filter((r) => r.type !== 'root').map((row) => {
                  const val = plan.features?.[row.key];
                  if (row.type === 'bool') {
                    return (
                      <li key={row.key} className="flex items-center gap-2">
                        {val
                          ? <Check size={15} className="text-green-500 flex-shrink-0" />
                          : <X size={15} className="text-gray-300 flex-shrink-0" />}
                        <span className={val ? 'text-gray-700' : 'text-gray-400'}>
                          {row.label}{val && row.trueText ? `: ${row.trueText}` : ''}
                        </span>
                      </li>
                    );
                  }
                  const formatted = row.format(val);
                  return (
                    <li key={row.key} className="flex items-center gap-2">
                      <Check size={15} className="text-primary-500 flex-shrink-0" />
                      <span className="text-gray-700">{row.label}: {formatted}</span>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-4 space-y-2">
                <button className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${colors.button}`}>
                  {plan.tier === 'FREE' ? 'شروع رایگان' : 'انتخاب این پلن'}
                </button>
                {plan.features?.trialEligible && !trialStatus && user?.role === 'VENUE_OWNER' && (
                  <button onClick={() => setTrialTier(plan.tier)}
                    className="w-full py-1.5 rounded-lg text-xs text-gray-500 border border-dashed border-gray-300 hover:border-primary-400 hover:text-primary-600 transition-colors">
                    شروع دوره آزمایشی رایگان ({plan.trialDays} روز)
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Trial status banner */}
      {trialStatus?.isActive && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <p className="font-semibold text-green-800">دوره آزمایشی {trialStatus.tier === 'PRO' ? 'حرفه‌ای' : 'حرفه‌ای‌پلاس'} فعال است</p>
          <p className="text-sm text-green-700 mt-1">{trialStatus.daysRemaining} روز باقی‌مانده — درآمد آزمایشی: {Number(trialStatus.revenue).toLocaleString('fa-IR')} تومان</p>
          {trialStatus.revenue < trialStatus.revenueThreshold && (
            <p className="text-xs text-green-600 mt-1">
              برای دریافت {trialStatus.effectiveDays === trialStatus.daysRemaining + (7 - 5) ? '۷' : '۵'} روز کامل، فروش خود را به {Number(trialStatus.revenueThreshold).toLocaleString('fa-IR')} تومان برسانید.
            </p>
          )}
        </div>
      )}

      {/* Trial form */}
      {trialTier && (
        <Card className="border-dashed border-primary-300">
          <h3 className="font-semibold text-gray-800 mb-3">شروع دوره آزمایشی — {trialTier === 'PRO' ? 'حرفه‌ای' : 'حرفه‌ای‌پلاس'}</h3>
          <p className="text-xs text-gray-500 mb-3">برای تأیید هویت و جلوگیری از سوء استفاده، لطفاً اطلاعات زیر را وارد کنید.</p>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="تلفن کسب‌وکار" value={trialForm.phone} onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })} />
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="شناسه ملی کسب‌وکار" value={trialForm.businessId} onChange={(e) => setTrialForm({ ...trialForm, businessId: e.target.value })} />
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="شماره حساب بانکی" value={trialForm.bankAccount} onChange={(e) => setTrialForm({ ...trialForm, bankAccount: e.target.value })} />
          </div>
          {trialMsg && <p className={`text-sm mb-3 ${trialMsg.includes('موفق') ? 'text-green-600' : 'text-red-600'}`}>{trialMsg}</p>}
          <div className="flex gap-2">
            <Button onClick={() => startTrial(trialTier)}>شروع آزمایش</Button>
            <Button variant="ghost" onClick={() => { setTrialTier(''); setTrialMsg(''); }}>انصراف</Button>
          </div>
        </Card>
      )}

      {/* Comparison table */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">مقایسه کامل پلن‌ها</h2>
        <div className="overflow-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-gray-500 font-medium">ویژگی</th>
                {plans.map((p) => (
                  <th key={p.tier} className={`px-4 py-3 font-bold ${p.tier === 'PRO' ? 'text-primary-700' : p.tier === 'ULTRA' ? 'text-purple-700' : 'text-gray-700'}`}>
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr key={row.key} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 text-gray-600 font-medium">{row.label}</td>
                  {plans.map((plan) => {
                    const raw = row.type === 'root' ? (row.key === 'commissionRate' ? plan.commissionRate : plan.monthlyPrice)
                      : plan.features?.[row.key];
                    if (row.type === 'bool') {
                      return (
                        <td key={plan.tier} className="px-4 py-2.5">
                          {raw
                            ? <Check size={15} className="text-green-600" />
                            : <X size={15} className="text-gray-300" />}
                        </td>
                      );
                    }
                    const formatted = row.format ? row.format(raw) : raw;
                    return (
                      <td key={plan.tier} className="px-4 py-2.5 text-gray-800">{formatted}</td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost estimator */}
      <Card>
        <h2 className="text-lg font-bold text-gray-800 mb-1">ماشین حساب هزینه</h2>
        <p className="text-sm text-gray-500 mb-4">با وارد کردن درآمد ماهانه مجموعه‌تان، بهترین پلن را پیدا کنید.</p>
        <div className="flex gap-3 items-center mb-6">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">درآمد ماهانه تخمینی (تومان)</label>
            <input type="number" step="100000" min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="مثال: ۵۰۰۰۰۰۰۰"
              value={monthlyRevenue}
              onChange={(e) => setMonthlyRevenue(e.target.value)} />
          </div>
          {revenue > 0 && (
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-1">بهترین انتخاب برای شما</p>
              <p className="font-bold text-primary-700">{cheapest?.name}</p>
            </div>
          )}
        </div>

        {revenue > 0 && (
          <div className="grid md:grid-cols-3 gap-4">
            {estimations.map((est) => {
              const isBest = est.tier === cheapest?.tier;
              return (
                <div key={est.tier} className={`rounded-xl p-4 border ${isBest ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}>
                  <p className="font-semibold text-gray-800 mb-3">{est.name}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">کارمزد ({(est.commissionRate * 100).toFixed(0)}٪)</span>
                      <span>{Number(est.commission).toLocaleString('fa-IR')}</span>
                    </div>
                    {est.fixed > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">اشتراک ماهانه</span>
                        <span>{Number(est.fixed).toLocaleString('fa-IR')}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold border-t pt-1 mt-1">
                      <span>جمع ماهانه</span>
                      <span className={isBest ? 'text-primary-700' : ''}>{Number(est.total).toLocaleString('fa-IR')}</span>
                    </div>
                    {billing === 'yearly' && (
                      <>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>جمع سالانه</span>
                          <span>{Number(est.yearlyTotal).toLocaleString('fa-IR')}</span>
                        </div>
                        {est.yearlyPrice > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            صرفه‌جویی {Number(est.total * 12 - est.yearlyTotal).toLocaleString('fa-IR')} تومان نسبت به ماهانه
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {isBest && <p className="flex items-center justify-center gap-1 text-xs text-primary-600 font-medium mt-2"><CheckCircle size={13} />بهترین گزینه برای شما</p>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* FAQ */}
      <div className="text-center text-sm text-gray-400 space-y-1">
        <p>تمام قیمت‌ها به تومان و بدون مالیات ارزش افزوده هستند.</p>
        <p>در پلن سالانه، هزینه اشتراک یکجا برای ۱۲ ماه پرداخت می‌شود.</p>
      </div>
    </div>
  );
}
