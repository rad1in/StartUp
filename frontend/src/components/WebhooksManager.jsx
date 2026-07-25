import { useEffect, useState } from 'react';
import { Webhook, Trash2, Copy, Check, Send } from 'lucide-react';
import api from '../services/api';
import Card from './Card';
import Button from './Button';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';

const EVENT_LABELS = {
  'order.created': 'ثبت سفارش جدید',
  'order.statusChanged': 'تغییر وضعیت سفارش',
  'order.voided': 'لغو سفارش',
};

export default function WebhooksManager({ venueId }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [webhooks, setWebhooks] = useState([]);
  const [availableEvents, setAvailableEvents] = useState([]);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [creating, setCreating] = useState(false);
  const [freshSecret, setFreshSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [testingId, setTestingId] = useState(null);

  async function refresh() {
    const { data } = await api.get(`/venues/${venueId}/webhooks`);
    setWebhooks(data.webhooks);
    setAvailableEvents(data.availableEvents);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  function toggleEvent(ev) {
    setSelectedEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function createWebhook(e) {
    e.preventDefault();
    if (!url.trim() || selectedEvents.length === 0) return;
    setCreating(true);
    try {
      const { data } = await api.post(`/venues/${venueId}/webhooks`, { url, events: selectedEvents });
      setFreshSecret(data.secret);
      setUrl('');
      setSelectedEvents([]);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ساخت وب‌هوک ناموفق بود.');
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(hook) {
    await api.patch(`/venues/${venueId}/webhooks/${hook.id}`, { isActive: !hook.isActive });
    refresh();
  }

  async function removeWebhook(hook) {
    if (!(await confirm('این وب‌هوک حذف شود؟', { danger: true }))) return;
    await api.delete(`/venues/${venueId}/webhooks/${hook.id}`);
    refresh();
  }

  async function testWebhook(hook) {
    setTestingId(hook.id);
    try {
      const { data } = await api.post(`/venues/${venueId}/webhooks/${hook.id}/test`);
      if (data.ok) toast.success('ارسال آزمایشی موفق بود.');
      else toast.error(`ارسال آزمایشی ناموفق بود: ${data.error || `HTTP ${data.status}`}`);
      refresh();
    } finally {
      setTestingId(null);
    }
  }

  function copySecret() {
    navigator.clipboard?.writeText(freshSecret);
    setCopied(true);
    toast.success('کلید مخفی کپی شد.');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <h3 className="font-bold text-ink text-sm mb-1 flex items-center gap-1.5">
        <Webhook size={15} />
        وب‌هوک‌ها
      </h3>
      <p className="text-xs text-ink/45 mb-3">
        با ثبت آدرس یک سرویس بیرونی (POS، سیستم آشپزخانه و…)، رویدادهای سفارش برای آن به‌صورت خودکار و امضاشده (HMAC) ارسال
        می‌شود.
      </p>

      {freshSecret && (
        <div className="bg-accent-50 border border-accent-200 rounded-xl p-3 mb-3">
          <p className="text-xs font-bold text-accent-800 mb-1.5">
            کلید مخفی برای بررسی امضا فقط یک‌بار نمایش داده می‌شود — همین حالا کپی کنید:
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white/60 rounded-lg px-2 py-1.5 overflow-x-auto" dir="ltr">
              {freshSecret}
            </code>
            <button type="button" onClick={copySecret} className="shrink-0 text-accent-700">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={createWebhook} className="space-y-2 mb-4">
        <input
          className="glass-input w-full rounded-xl px-3 py-2 text-sm"
          placeholder="https://example.com/webhooks/etcafe"
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {availableEvents.map((ev) => (
            <label
              key={ev}
              className={`text-xs px-2.5 py-1 rounded-full cursor-pointer border ${
                selectedEvents.includes(ev) ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-ink/10 text-ink/50'
              }`}
            >
              <input type="checkbox" className="hidden" checked={selectedEvents.includes(ev)} onChange={() => toggleEvent(ev)} />
              {EVENT_LABELS[ev] || ev}
            </label>
          ))}
        </div>
        <Button type="submit" disabled={creating || !url.trim() || selectedEvents.length === 0}>
          {creating ? 'در حال ساخت...' : 'افزودن وب‌هوک'}
        </Button>
      </form>

      <div className="space-y-2">
        {webhooks.map((w) => (
          <div key={w.id} className="text-sm bg-surface-2/50 rounded-xl px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-ink truncate" dir="ltr">
                {w.url}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => testWebhook(w)} disabled={testingId === w.id} className="text-ink/40 hover:text-primary-700">
                  <Send size={14} />
                </button>
                <button type="button" onClick={() => toggleActive(w)} className={`text-xs font-bold ${w.isActive ? 'text-green-600' : 'text-ink/30'}`}>
                  {w.isActive ? 'فعال' : 'غیرفعال'}
                </button>
                <button type="button" onClick={() => removeWebhook(w)} className="text-ink/40 hover:text-red-600">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {w.events.map((ev) => (
                <span key={ev} className="text-[10px] bg-ink/5 text-ink/50 rounded-full px-2 py-0.5">
                  {EVENT_LABELS[ev] || ev}
                </span>
              ))}
              {w.lastStatus && (
                <span className={`text-[10px] rounded-full px-2 py-0.5 ${w.lastStatus === 'SUCCESS' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  آخرین ارسال: {w.lastStatus === 'SUCCESS' ? 'موفق' : 'ناموفق'}
                </span>
              )}
            </div>
          </div>
        ))}
        {webhooks.length === 0 && <p className="text-xs text-ink/40">هنوز وب‌هوکی ثبت نشده است.</p>}
      </div>
    </Card>
  );
}
