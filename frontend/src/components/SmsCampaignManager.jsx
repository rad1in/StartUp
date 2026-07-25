import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from './Card';
import Button from './Button';

const STATUS_LABEL = {
  PENDING: 'در انتظار تایید ادمین',
  APPROVED: 'تایید شده — در حال ارسال',
  REJECTED: 'رد شده',
  SENT: 'ارسال شد',
  FAILED: 'ارسال ناموفق',
};
const STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function SmsCampaignManager({ venueId }) {
  const [credit, setCredit] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', alsoSendEmail: false });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    const [{ data: creditData }, { data: campaignData }] = await Promise.all([
      api.get(`/venues/${venueId}/sms-campaigns/credit`),
      api.get(`/venues/${venueId}/sms-campaigns`),
    ]);
    setCredit(creditData.balance);
    setCampaigns(campaignData);
  }

  useEffect(() => {
    if (!venueId) return;
    refresh();
    api.get('/payments/methods').then(({ data }) => {
      setPaymentMethods(data);
      setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createCampaign(e) {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setMsg('');
    try {
      await api.post(`/venues/${venueId}/sms-campaigns`, form);
      setForm({ title: '', message: '', alsoSendEmail: false });
      setMsg('کمپین ثبت شد و برای تایید ادمین ارسال شد.');
      refresh();
    } catch (err) {
      setMsg(err.response?.data?.message || 'خطا در ثبت کمپین');
    }
  }

  async function topUp() {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;
    try {
      const { data } = await api.post(`/venues/${venueId}/sms-campaigns/credit/topup`, {
        amount,
        provider: selectedProvider || undefined,
      });
      if (data.success) {
        setCredit(data.balance);
        setTopUpAmount('');
        setMsg('اعتبار پیامکی شارژ شد.');
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'خطا در شارژ اعتبار');
    }
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-800 mb-1">ارسال پیامک تبلیغاتی به مشتریان</h3>
      <p className="text-xs text-gray-500 mb-3">
        متن شما بعد از تایید ادمین برای همه مشتریانی که از این کافه سفارش داده‌اند ارسال می‌شود. هزینه هر پیامک بر اساس پلن شما محاسبه می‌شود.
      </p>

      <div className="flex items-center justify-between bg-primary-50 rounded-lg px-4 py-3 mb-4">
        <span className="text-sm text-gray-700">اعتبار پیامکی فعلی</span>
        <span className="font-bold text-primary-800">{Number(credit).toLocaleString('fa-IR')} تومان</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min="1000"
          step="1000"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="مبلغ شارژ (تومان)"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={topUp} disabled={!topUpAmount}>
          شارژ اعتبار
        </Button>
      </div>
      {paymentMethods.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {paymentMethods.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setSelectedProvider(m.name)}
              className={`px-3 py-1.5 rounded-lg text-xs border font-bold ${
                selectedProvider === m.name ? 'border-primary-800 bg-primary-800 text-white' : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={createCampaign} className="space-y-2 mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
          placeholder="عنوان کمپین (اگه ایمیل هم بفرستید، موضوع ایمیل هم همینه)"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
          rows={3}
          maxLength={500}
          placeholder="متن پیامک..."
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.alsoSendEmail}
            onChange={(e) => setForm({ ...form, alsoSendEmail: e.target.checked })}
          />
          همین متن به ایمیل مشتریانی که ایمیل دارند هم ارسال شود (رایگان، هزینه‌ای اضافه ندارد)
        </label>
        <Button type="submit" className="w-full">
          ثبت کمپین برای تایید ادمین
        </Button>
      </form>

      {msg && <p className="text-sm text-ink font-medium mb-3">{msg}</p>}

      <div className="space-y-2">
        {campaigns.length === 0 && <p className="text-sm text-gray-400">هنوز کمپینی ثبت نشده است.</p>}
        {campaigns.map((c) => (
          <Card key={c.id} className="bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="font-bold text-primary-700">{c.title}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{c.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              گیرندگان: {c.recipientCount.toLocaleString('fa-IR')} — هزینه: {Number(c.totalCost).toLocaleString('fa-IR')} تومان
              {c.status === 'REJECTED' && c.rejectionReason && ` — دلیل رد: ${c.rejectionReason}`}
            </p>
          </Card>
        ))}
      </div>
    </Card>
  );
}
