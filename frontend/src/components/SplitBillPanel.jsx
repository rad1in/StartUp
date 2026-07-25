import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Button from './Button';
import { useToast } from '../context/ToastContext';

export default function SplitBillPanel({ orderId, totalAmount, shares, onSplitCreated, onPayShare }) {
  const toast = useToast();
  const [mode, setMode] = useState('equal');
  const [count, setCount] = useState(2);
  const [labels, setLabels] = useState(['نفر اول', 'نفر دوم']);
  const [creating, setCreating] = useState(false);

  function updateLabel(i, val) {
    setLabels((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  }

  function updateCount(n) {
    const clamped = Math.max(2, Math.min(10, n));
    setCount(clamped);
    setLabels((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`نفر ${next.length + 1}`);
      return next.slice(0, clamped);
    });
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const { default: api } = await import('../services/api');
      const { data } = await api.post(`/orders/${orderId}/shares`, {
        type: mode,
        labels,
      });
      onSplitCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'خطا در تقسیم صورتحساب');
    } finally {
      setCreating(false);
    }
  }

  if (shares && shares.length > 0) {
    return (
      <div className="space-y-2 mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">تقسیم صورتحساب</p>
        {shares.map((share) => (
          <div key={share.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
            <span className="font-medium text-gray-700">{share.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{Number(share.amount).toLocaleString('fa-IR')} تومان</span>
              {share.paymentStatus === 'SUCCESS' ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={13} />پرداخت شده</span>
              ) : (
                <Button variant="secondary" onClick={() => onPayShare(share)}>
                  پرداخت سهم
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-3 border border-gray-200 rounded-xl p-3">
      <p className="text-sm font-semibold text-gray-700">تقسیم صورتحساب</p>
      <div className="flex gap-2">
        <button
          className={`flex-1 text-sm py-1.5 rounded-lg border ${mode === 'equal' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
          onClick={() => setMode('equal')}
        >
          مساوی
        </button>
      </div>

      {mode === 'equal' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">تعداد نفرات:</label>
            <button
              className="w-7 h-7 rounded bg-gray-200 text-sm"
              onClick={() => updateCount(count - 1)}
            >
              -
            </button>
            <span className="text-sm font-medium w-4 text-center">{count}</span>
            <button
              className="w-7 h-7 rounded bg-gray-200 text-sm"
              onClick={() => updateCount(count + 1)}
            >
              +
            </button>
            <span className="text-xs text-gray-500 mr-2">
              هر نفر: {Math.floor((totalAmount / count) * 1) > 0 ? Math.round(totalAmount / count).toLocaleString('fa-IR') : '—'} تومان
            </span>
          </div>
          <div className="space-y-1">
            {labels.map((label, i) => (
              <input
                key={i}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder={`نام نفر ${i + 1}`}
                value={label}
                onChange={(e) => updateLabel(i, e.target.value)}
              />
            ))}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={handleCreate} disabled={creating}>
        {creating ? 'در حال تقسیم...' : 'ایجاد تقسیم صورتحساب'}
      </Button>
    </div>
  );
}
