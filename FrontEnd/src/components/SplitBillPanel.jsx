import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import Button from './Button';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';

export default function SplitBillPanel({ orderId, totalAmount, shares, onSplitCreated, onPayShare }) {
  const { t, n } = useLanguage();
  const toast = useToast();
  const [mode, setMode] = useState('equal');
  const [count, setCount] = useState(2);
  const [labels, setLabels] = useState([
    `${t('components.splitBillPanel.personLabelPrefix')} ${n(1)}`,
    `${t('components.splitBillPanel.personLabelPrefix')} ${n(2)}`,
  ]);
  const [creating, setCreating] = useState(false);

  function updateLabel(i, val) {
    setLabels((prev) => prev.map((l, idx) => (idx === i ? val : l)));
  }

  function updateCount(count2) {
    const clamped = Math.max(2, Math.min(10, count2));
    setCount(clamped);
    setLabels((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`${t('components.splitBillPanel.personLabelPrefix')} ${n(next.length + 1)}`);
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
      toast.error(err.response?.data?.message || t('components.splitBillPanel.splitError'));
    } finally {
      setCreating(false);
    }
  }

  if (shares && shares.length > 0) {
    return (
      <div className="space-y-2 mb-3">
        <p className="text-sm font-semibold text-gray-700 mb-2">{t('menu.splitBill')}</p>
        {shares.map((share) => (
          <div key={share.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 text-sm">
            <span className="font-medium text-gray-700">{share.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{n(Number(share.amount))} {t('menu.toman')}</span>
              {share.paymentStatus === 'SUCCESS' ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle size={13} />{t('components.splitBillPanel.paidShare')}</span>
              ) : (
                <Button variant="secondary" onClick={() => onPayShare(share)}>
                  {t('components.splitBillPanel.payShareButton')}
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
      <p className="text-sm font-semibold text-gray-700">{t('menu.splitBill')}</p>
      <div className="flex gap-2">
        <button
          className={`flex-1 text-sm py-1.5 rounded-lg border ${mode === 'equal' ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'}`}
          onClick={() => setMode('equal')}
        >
          {t('components.splitBillPanel.equalButton')}
        </button>
      </div>

      {mode === 'equal' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600">{t('components.splitBillPanel.countLabel')}</label>
            <button
              className="w-7 h-7 rounded bg-gray-200 text-sm"
              onClick={() => updateCount(count - 1)}
            >
              -
            </button>
            <span className="text-sm font-medium w-4 text-center">{n(count)}</span>
            <button
              className="w-7 h-7 rounded bg-gray-200 text-sm"
              onClick={() => updateCount(count + 1)}
            >
              +
            </button>
            <span className="text-xs text-gray-500 mr-2">
              {t('components.splitBillPanel.perPersonLabel')} {Math.floor((totalAmount / count) * 1) > 0 ? n(Math.round(totalAmount / count)) : '—'} {t('menu.toman')}
            </span>
          </div>
          <div className="space-y-1">
            {labels.map((label, i) => (
              <input
                key={i}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder={`${t('components.splitBillPanel.namePlaceholderPrefix')} ${n(i + 1)}`}
                value={label}
                onChange={(e) => updateLabel(i, e.target.value)}
              />
            ))}
          </div>
        </div>
      )}

      <Button className="w-full" onClick={handleCreate} disabled={creating}>
        {creating ? t('components.splitBillPanel.splitting') : t('components.splitBillPanel.createSplit')}
      </Button>
    </div>
  );
}
