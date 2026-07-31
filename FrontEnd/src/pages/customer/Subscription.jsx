import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Wallet, Gift, Percent } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

export default function Subscription() {
  const { t, n } = useLanguage();
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
      setMsg({ type: 'success', text: t('subscription.activated') });
      await refresh();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || t('subscription.purchaseError') });
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
        <h2 className="text-xl font-black text-ink mb-1">{t('subscription.title')}</h2>
        <p className="text-sm text-ink/50 max-w-sm mx-auto">
          {t('subscription.subtitle')}
        </p>

        {sub?.active ? (
          <div className="mt-6 inline-flex flex-col items-center gap-2 bg-accent-50 border border-accent-200 rounded-2xl px-6 py-4">
            <span className="chip-gold">{t('subscription.activeBadge')}</span>
            <p className="text-sm text-ink/70">
              <b className="text-ink">{n(sub.daysLeft)}</b> {t('subscription.daysLeftSuffix')}
            </p>
            <p className="text-xs text-ink/50">
              {n(sub.highDiscountCount)} {t('subscription.bigDiscountUsagePrefix')} {n(sub.highDiscountCap)} {t('subscription.bigDiscountUsageSuffix')}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-2xl font-black text-accent-600">
              {n(Number(plan.price))} <span className="text-sm font-medium text-ink/50">{t('subscription.per30Days')}</span>
            </p>
            {!plan.enabled ? (
              <p className="text-sm text-ink/40">{t('subscription.saleDisabled')}</p>
            ) : (
              <>
                <Button variant="accent" onClick={handlePurchase} disabled={purchasing || !hasEnoughBalance}>
                  {purchasing ? t('account.processing') : t('subscription.buy')}
                </Button>
                {!hasEnoughBalance && (
                  <p className="text-xs text-red-600">
                    {t('subscription.insufficientPrefix')} ({n(Number(walletBalance))} {t('menu.toman')}). {t('subscription.insufficientFirst')}{' '}
                    <Link to="/account/wallet" className="underline font-bold">
                      {t('subscription.insufficientLink')}
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
          <p className="text-sm font-bold text-ink">{t('subscription.perkDiscountTitle')}</p>
          <p className="text-xs text-ink/50 mt-1">{t('subscription.perkDiscountDesc')}</p>
        </Card>
        <Card className="text-center py-5">
          <Gift size={22} className="mx-auto text-accent-600 mb-2" />
          <p className="text-sm font-bold text-ink">{t('subscription.perkBigTitle')}</p>
          <p className="text-xs text-ink/50 mt-1">{t('subscription.perkBigDesc')}</p>
        </Card>
        <Card className="text-center py-5">
          <Wallet size={22} className="mx-auto text-accent-600 mb-2" />
          <p className="text-sm font-bold text-ink">{t('subscription.perkWalletTitle')}</p>
          <p className="text-xs text-ink/50 mt-1">{t('subscription.perkWalletDesc')}</p>
        </Card>
      </div>
    </div>
  );
}
