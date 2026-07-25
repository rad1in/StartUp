import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

const TX_TYPE_LABEL = {
  TOPUP: 'شارژ',
  SPEND: 'پرداخت',
  REFUND: 'استرداد',
  ADJUSTMENT: 'تنظیم دستی',
};
const TX_TYPE_COLOR = {
  TOPUP: 'text-green-600',
  REFUND: 'text-green-600',
  SPEND: 'text-red-600',
  ADJUSTMENT: 'text-yellow-600',
};

export default function Wallet() {
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topping, setTopping] = useState(false);
  const [msg, setMsg] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  async function refresh() {
    setLoading(true);
    const [{ data: bal }, { data: txs }] = await Promise.all([
      api.get('/wallet'),
      api.get('/wallet/transactions'),
    ]);
    setBalance(bal.balance);
    setTransactions(txs);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    api.get('/payments/methods').then(({ data }) => {
      setPaymentMethods(data);
      setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
    }).catch(() => {});
  }, []);

  async function handleTopUp(e) {
    e.preventDefault();
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return setMsg({ type: 'error', text: 'مبلغ معتبر وارد کنید.' });
    setTopping(true);
    setMsg(null);
    try {
      const { data } = await api.post('/wallet/topup', { amount, provider: selectedProvider || undefined });
      if (data.success) {
        setMsg({ type: 'success', text: `کیف پول شما به‌روز شد. موجودی جدید: ${Number(data.balance).toLocaleString('fa-IR')} تومان` });
        setTopUpAmount('');
        await refresh();
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'خطا در شارژ کیف پول' });
    } finally {
      setTopping(false);
    }
  }

  const presets = [50000, 100000, 200000, 500000];

  return (
    <div className="space-y-6">
      {/* Balance */}
      <Card className="text-center py-8">
        <p className="text-sm text-gray-500 mb-1">موجودی کیف پول</p>
        {loading ? (
          <p className="text-gray-400">در حال بارگذاری...</p>
        ) : (
          <p className="text-4xl font-bold text-primary-700">
            {Number(balance).toLocaleString('fa-IR')}
            <span className="text-lg font-normal text-gray-500 mr-2">تومان</span>
          </p>
        )}
      </Card>

      {/* Top-up */}
      <Card>
        <h2 className="text-base font-semibold text-gray-800 mb-4">شارژ کیف پول</h2>
        <form onSubmit={handleTopUp} className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTopUpAmount(String(p))}
                className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                  topUpAmount === String(p)
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'border-gray-300 text-gray-600 hover:border-primary-400'
                }`}
              >
                {p.toLocaleString('fa-IR')} تومان
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1000"
              step="1000"
              placeholder="مبلغ دلخواه (تومان)"
              value={topUpAmount}
              onChange={(e) => setTopUpAmount(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <Button type="submit" disabled={topping || !topUpAmount}>
              {topping ? 'در حال پردازش...' : 'شارژ'}
            </Button>
          </div>
          {paymentMethods.length > 1 && (
            <div>
              <label className="text-xs text-gray-500">روش پرداخت</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {paymentMethods.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => setSelectedProvider(m.name)}
                    className={`px-3 py-1.5 rounded-lg text-xs border font-bold ${
                      selectedProvider === m.name
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msg && (
            <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {msg.text}
            </p>
          )}
        </form>
      </Card>

      {/* Transaction history */}
      <Card>
        <h2 className="text-base font-semibold text-gray-800 mb-4">تاریخچه تراکنش‌ها</h2>
        {loading ? (
          <p className="text-gray-400 text-sm">در حال بارگذاری...</p>
        ) : transactions.length === 0 ? (
          <p className="text-gray-500 text-sm">هنوز تراکنشی ثبت نشده است.</p>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {TX_TYPE_LABEL[tx.type] || tx.type}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(tx.createdAt).toLocaleString('fa-IR')}
                    {tx.description && ` — ${tx.description}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${TX_TYPE_COLOR[tx.type] || 'text-gray-600'}`}>
                    {tx.type === 'SPEND' ? '-' : '+'}{Number(tx.amount).toLocaleString('fa-IR')} تومان
                  </p>
                  <p className="text-xs text-gray-400">
                    موجودی: {Number(tx.balanceAfter).toLocaleString('fa-IR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
