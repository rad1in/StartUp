import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';

const TX_LABELS = { EARN: 'کسب امتیاز', REDEEM: 'استفاده از امتیاز', ADJUST: 'اصلاح دستی' };

export default function Loyalty() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    api.get('/loyalty/balance').then(({ data }) => setBalance(data.balance));
    api.get('/loyalty/transactions').then(({ data }) => setTransactions(data));
    api.get('/customers/coupons').then(({ data }) => setCoupons(data));
    api.get('/gamification/me').then(({ data }) => setProgress(data)).catch(() => {});
  }, []);

  const earnedBadgeIds = new Set((progress?.earnedBadges || []).map((b) => b.badgeConfigId || b.id));

  return (
    <div className="space-y-6">
      {/* Tier card */}
      {progress && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">سطح وفاداری</h3>
              {progress.currentTier ? (
                <p className="text-lg font-bold text-primary-700 mt-1">
                  {progress.currentTier.tierIcon} {progress.currentTier.tierName}
                </p>
              ) : (
                <p className="text-sm text-gray-500 mt-1">هنوز سطحی کسب نشده است.</p>
              )}
            </div>
            <div className="text-right text-sm text-gray-600">
              <p>{Number(progress.stats.totalOrders).toLocaleString('fa-IR')} سفارش</p>
              <p>{Number(progress.stats.totalSpend).toLocaleString('fa-IR')} تومان</p>
            </div>
          </div>

          {/* Tier progress ladder */}
          <div className="space-y-2">
            {progress.tiers.map((tier) => {
              const isActive = progress.currentTier?.tierConfigId === tier.id || progress.currentTier?.tierConfig === tier.id;
              const isCurrent = progress.currentTier && (progress.currentTier.tierConfigId === tier.id);
              const spendPct = Math.min(100, (progress.stats.totalSpend / Math.max(1, Number(tier.minSpend))) * 100);
              const orderPct = Math.min(100, (progress.stats.totalOrders / Math.max(1, Number(tier.minOrders))) * 100);
              const pct = Number(tier.minSpend) === 0 && Number(tier.minOrders) === 0 ? 100 : Math.min(spendPct, orderPct);
              return (
                <div key={tier.id} className={`rounded-lg p-3 border ${isCurrent ? 'border-primary-400 bg-primary-50' : 'border-gray-200'}`}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{tier.icon} {tier.name}</span>
                    {isCurrent && <span className="text-xs bg-primary-600 text-white px-2 py-0.5 rounded-full">سطح فعلی</span>}
                  </div>
                  {pct < 100 && (
                    <>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{Math.round(pct)}٪ تا این سطح</p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {progress.currentTier?.perks && (
            <div className="mt-3 pt-3 border-t text-sm text-gray-600">
              <p className="font-medium mb-1">مزایای سطح فعلی:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-gray-500">
                {(Array.isArray(progress.currentTier.perks)
                  ? progress.currentTier.perks
                  : JSON.parse(progress.currentTier.perks || '[]')
                ).map((perk, i) => <li key={i}>{perk}</li>)}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* Badge collection */}
      {progress && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">مجموعه نشان‌ها</h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {progress.allBadges.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  title={badge.description}
                  className={`flex flex-col items-center p-2 rounded-lg border text-center transition-opacity ${
                    earned ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 opacity-40 grayscale'
                  }`}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{badge.name}</p>
                  {earned && (
                    <p className="text-[10px] text-green-600 mt-0.5">
                      {new Date(
                        progress.earnedBadges.find((b) => b.id === badge.id)?.earnedAt || ''
                      ).toLocaleDateString('fa-IR')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Loyalty points */}
      <Card>
        <h3 className="font-semibold text-gray-800">کیف پول امتیاز وفاداری</h3>
        <p className="text-2xl font-bold text-primary-700 mt-2">{balance.toLocaleString('fa-IR')} امتیاز</p>
        <p className="text-xs text-gray-500 mt-1">هر امتیاز معادل ۱٬۰۰۰ تومان تخفیف در پرداخت سفارش‌های بعدی است.</p>
      </Card>

      <div>
        <h3 className="font-semibold text-gray-800 mb-2">تاریخچه امتیاز</h3>
        {transactions.length === 0 && <p className="text-gray-500 text-sm">هنوز تراکنش امتیازی ثبت نشده است.</p>}
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Card key={tx.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">{TX_LABELS[tx.type] || tx.type}</p>
                <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleString('fa-IR')}</p>
              </div>
              <p className={`font-bold ${tx.points >= 0 ? 'text-ink' : 'text-ink/50'}`}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-2">کدهای تخفیف فعال</h3>
        {coupons.length === 0 && <p className="text-gray-500 text-sm">در حال حاضر کد تخفیفی موجود نیست.</p>}
        <div className="grid sm:grid-cols-2 gap-3">
          {coupons.map((coupon) => (
            <Card key={coupon.id}>
              <p className="font-bold text-primary-700">{coupon.code}</p>
              <p className="text-sm text-gray-600 mt-1">
                {coupon.discountType === 'PERCENT'
                  ? `${coupon.discountValue}٪ تخفیف`
                  : `${Number(coupon.discountValue).toLocaleString('fa-IR')} تومان تخفیف`}
              </p>
              {coupon.minOrderAmount && (
                <p className="text-xs text-gray-400 mt-1">
                  حداقل سفارش: {Number(coupon.minOrderAmount).toLocaleString('fa-IR')} تومان
                </p>
              )}
              {coupon.expiresAt && (
                <p className="text-xs text-gray-400">انقضا: {new Date(coupon.expiresAt).toLocaleDateString('fa-IR')}</p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
