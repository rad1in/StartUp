import { useEffect, useState } from 'react';
import { KeyRound, Trash2, Copy, Check } from 'lucide-react';
import api from '../services/api';
import Card from './Card';
import Button from './Button';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

export default function ApiKeysManager({ venueId }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [keys, setKeys] = useState([]);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [freshKey, setFreshKey] = useState(null);
  const [copied, setCopied] = useState(false);

  async function refresh() {
    const { data } = await api.get(`/venues/${venueId}/api-keys`);
    setKeys(data);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createKey(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post(`/venues/${venueId}/api-keys`, { label });
      setFreshKey(data.key);
      setLabel('');
      refresh();
    } finally {
      setCreating(false);
    }
  }

  async function revoke(key) {
    if (!(await confirm(`کلید «${key.label}» باطل شود؟ این کار قابل بازگشت نیست.`, { danger: true }))) return;
    await api.delete(`/venues/${venueId}/api-keys/${key.id}`);
    refresh();
  }

  function copyKey() {
    navigator.clipboard?.writeText(freshKey);
    setCopied(true);
    toast.success('کلید کپی شد.');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <h3 className="font-bold text-ink text-sm mb-1 flex items-center gap-1.5">
        <KeyRound size={15} />
        کلیدهای API
      </h3>
      <p className="text-xs text-ink/45 mb-3">برای اتصال سیستم‌های خودتان (POS، حسابداری و…) به ET-Cafe.</p>

      {freshKey && (
        <div className="bg-accent-50 border border-accent-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-accent-800 mb-1.5">این کلید فقط یک‌بار نمایش داده می‌شود — همین حالا کپی کنید:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white/60 rounded-lg px-2 py-1.5 overflow-x-auto" dir="ltr">{freshKey}</code>
            <button type="button" onClick={copyKey} className="shrink-0 text-accent-700">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={createKey} className="flex gap-2 mb-4">
        <input
          className="glass-input flex-1 rounded-xl px-3 py-2 text-sm"
          placeholder="نام کلید (مثلاً «POS فروشگاه»)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Button type="submit" disabled={creating || !label.trim()}>
          {creating ? 'در حال ساخت...' : 'ساخت کلید'}
        </Button>
      </form>

      <div className="space-y-2">
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between text-sm bg-surface-2/50 rounded-xl px-3 py-2">
            <div>
              <p className="font-medium text-ink">{k.label}</p>
              <p className="text-xs text-ink/40" dir="ltr">{k.keyPrefix}••••••••</p>
            </div>
            {k.revokedAt ? (
              <span className="text-xs text-red-500 font-bold">باطل‌شده</span>
            ) : (
              <button type="button" onClick={() => revoke(k)} className="text-ink/40 hover:text-red-600">
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {keys.length === 0 && <p className="text-xs text-ink/40">هنوز کلیدی نساخته‌اید.</p>}
      </div>
    </Card>
  );
}
