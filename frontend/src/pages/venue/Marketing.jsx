import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/Card';
import Button from '../../components/Button';
import HappyHourManager from '../../components/HappyHourManager';
import PunchCardManager from '../../components/PunchCardManager';
import SmsCampaignManager from '../../components/SmsCampaignManager';

export default function Marketing() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState({
    code: '',
    discountType: 'PERCENT',
    discountValue: '',
    maxRedemptions: '',
    minOrderAmount: '',
    expiresAt: '',
  });
  const [notifyMessage, setNotifyMessage] = useState('');

  async function refresh() {
    const { data } = await api.get(`/coupons/venue/${venueId}`);
    setCoupons(data);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createCoupon(e) {
    e.preventDefault();
    if (!form.code || !form.discountValue) return;
    await api.post(`/coupons/venue/${venueId}`, {
      ...form,
      discountValue: Number(form.discountValue),
      maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
      minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : null,
      expiresAt: form.expiresAt || null,
    });
    setForm({ code: '', discountType: 'PERCENT', discountValue: '', maxRedemptions: '', minOrderAmount: '', expiresAt: '' });
    refresh();
  }

  async function toggleActive(coupon) {
    await api.patch(`/coupons/venue/${venueId}/${coupon.id}`, { isActive: !coupon.isActive });
    refresh();
  }

  async function removeCoupon(coupon) {
    await api.delete(`/coupons/venue/${venueId}/${coupon.id}`);
    refresh();
  }

  async function sendPromo(coupon) {
    setNotifyMessage('');
    const { data } = await api.post(`/coupons/venue/${venueId}/${coupon.id}/notify`);
    setNotifyMessage(`اعلان برای ${data.notifiedCount} مشتری ارسال شد.`);
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-6">
      <HappyHourManager venueId={venueId} />

      <PunchCardManager venueId={venueId} />

      <SmsCampaignManager venueId={venueId} />

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">ساخت کد تخفیف جدید</h3>
        <form onSubmit={createCoupon} className="grid sm:grid-cols-2 gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="کد تخفیف (مثلاً SUMMER20)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
          >
            <option value="PERCENT">درصدی</option>
            <option value="FIXED">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={form.discountType === 'PERCENT' ? 'درصد تخفیف' : 'مبلغ تخفیف (تومان)'}
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="حداکثر تعداد استفاده (اختیاری)"
            value={form.maxRedemptions}
            onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })}
          />
          <input
            type="number"
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="حداقل مبلغ سفارش (اختیاری)"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={form.expiresAt}
            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
          />
          <Button type="submit" className="sm:col-span-2">
            ساخت کد تخفیف
          </Button>
        </form>
      </Card>

      {notifyMessage && <p className="flex items-center gap-1 text-sm text-ink font-medium"><CheckCircle size={14} />{notifyMessage}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {coupons.map((coupon) => (
          <Card key={coupon.id}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-primary-700">{coupon.code}</p>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  coupon.isActive ? 'bg-primary-800 text-white' : 'bg-gray-200 text-ink/50'
                }`}
              >
                {coupon.isActive ? 'فعال' : 'غیرفعال'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {coupon.discountType === 'PERCENT'
                ? `${coupon.discountValue}٪ تخفیف`
                : `${Number(coupon.discountValue).toLocaleString('fa-IR')} تومان تخفیف`}
            </p>
            <p className="text-xs text-gray-400">
              استفاده‌شده: {coupon.redeemedCount}
              {coupon.maxRedemptions ? ` از ${coupon.maxRedemptions}` : ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button variant="secondary" onClick={() => sendPromo(coupon)}>
                ارسال اعلان تخفیف
              </Button>
              <Button variant="ghost" onClick={() => toggleActive(coupon)}>
                {coupon.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              </Button>
              <Button variant="danger" onClick={() => removeCoupon(coupon)}>
                حذف
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
