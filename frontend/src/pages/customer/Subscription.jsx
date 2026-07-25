import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wallet, Gift, Percent } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Subscription() {
  const [plan, setPlan] = useState(null);
  const [sub, setSub] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [msg, setMsg] = useState(null);

  async function refresh() {
    setLoading(true);
    const [{ data: planData }, { data: subData }, { data: walletData }] = await Promise.all([
      api.get('/subscription/plan'),
      api.get('/subscription/me'),
      api.get('/wallet'),
    ]);
    setPlan(planData);
    setSub(subData);
    setWalletBalance(Number(walletData.balance));
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handlePurchase() {
    setPurchasing(true);
    setMsg(null);
    try {
      await api.post('/subscription/purchase');
      setMsg({ type: 'success', text: 'اشتراک شما با موفقیت فعال شد! از این به بعد روی هر خرید، تخفیف تصادفی می‌گیری.' });
      await refresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'خطا در خرید اشتراک.' });
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-40 rounded-2xl" />
        <div className="skeleton h-24 rounded-2xl" />
      </div>
    );
  }

  const hasEnoughBalance = plan && walletBalance >= plan.price;

  return (
    <div className="space-y-6">
      <Card className="text-center py-8 relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 text-white flex items-center justify-center mx-auto mb-4 shadow-accent-glow">
          <Sparkles size={28} />
        </div>
        <h2 className="text-xl font-black text-ink mb-1">اشتراک تخفیف ET-Cafe</h2>
        <p className="text-sm text-ink/50 max-w-sm mx-auto">
          روی هر سفارشی که ثبت می‌کنی، یک تخفیف تصادفی بین ۵٪ تا ۹۰٪ می‌گیری — هر چه بیشتر سفارش بدی، شانس بیشتری داری!
        </p>

        {sub?.active ? (
          <div className="mt-6 inline-flex flex-col items-center gap-2 bg-accent-50 border border-accent-200 rounded-2xl px-6 py-4">
            <span className="chip-gold">اشتراک فعال</span>
            <p className="text-sm text-ink/70">
              <b className="text-ink">{sub.daysLeft.toLocaleString('fa-IR')}</b> روز تا پایان دوره
            </p>
            <p className="text-xs text-ink/50">
              {sub.highDiscountCount.toLocaleString('fa-IR')} از {sub.highDiscountCap.toLocaleString('fa-IR')} تخفیف بزرگ (≥۵۰٪) این دوره استفاده شده
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-2xl font-black text-accent-600">
              {Number(plan.price).toLocaleString('fa-IR')} <span className="text-sm font-medium text-ink/50">تومان / ۳۰ روز</span>
            </p>
            {!plan.enabled ? (
              <p className="text-sm text-ink/40">در حال حاضر فروش اشتراک غیرفعال است.</p>
            ) : (
              <>
                <Button variant="accent" onClick={handlePurchase} disabled={purchasing || !hasEnoughBalance}>
                  {purchasing ? 'در حال پردازش...' : 'خرید اشتراک'}
                </Button>
                {!hasEnoughBalance && (
                  <p className="text-xs text-red-600">
                    موجودی کیف پول کافی نیست ({Number(walletBalance).toLocaleString('fa-IR')} تومان). ابتدا{' '}
                    <Link to="/account/wallet" className="underline font-bold">
                      کیف پولت رو شارژ کن
                    </Link>
                    .
                  </p>
                )}
              </>
            )}
            {msg && (
              <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
            )}
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-3 gap-3">
        <Card className="text-center py-5">
          <Percent size={22} className="mx-auto text-accent-600 mb-2" />
          <p className="text-sm font-bold text-ink">۵٪ تا ۹۰٪ تخفیف</p>
          <p className="text-xs text-ink/50 mt-1">روی هر سفارش، تخفیف تصادفی</p>
        </Card>
        <Card className="text-center py-5">
          <Gift size={22} className="mx-auto text-accent-600 mb-2" />
          <p className="text-sm font-bold text-ink">تخفیف‌های بزرگ</p>
          <p className="text-xs text-ink/50 mt-1">تا ۳ تخفیف ≥۵۰٪ در هر دوره</p>
        </Card>
        <Card className="text-center py-5">
          <Wallet size={22} className="mx-auto text-accent-600 mb-2" />
          <p className="text-sm font-bold text-ink">پرداخت از کیف پول</p>
          <p className="text-xs text-ink/50 mt-1">بدون نیاز به کارت، فوری فعال می‌شه</p>
        </Card>
      </div>
    </div>
  );
}
