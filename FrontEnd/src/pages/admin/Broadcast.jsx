import { useEffect, useState } from 'react';
import { Megaphone, Users, Store, Globe, Send, CheckCircle2, Clock, X } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

// Admin broadcast composer — sends a platform-wide in-app announcement either
// immediately or at a scheduled future time (queued server-side and sent by
// a minute-interval checker in server.js).
export default function Broadcast() {
  const { t, n, date } = useLanguage();
  const confirm = useConfirm();
  const toast = useToast();
  const [audience, setAudience] = useState('CUSTOMERS');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [scheduled, setScheduled] = useState([]);

  const AUDIENCES = [
    { value: 'CUSTOMERS', label: t('admin.broadcast.audienceCustomers'), icon: Users, hint: t('admin.broadcast.audienceCustomersHint') },
    { value: 'VENUE_OWNERS', label: t('admin.broadcast.audienceVenueOwners'), icon: Store, hint: t('admin.broadcast.audienceVenueOwnersHint') },
    { value: 'ALL', label: t('admin.broadcast.audienceAll'), icon: Globe, hint: t('admin.broadcast.audienceAllHint') },
  ];

  const canSend = title.trim() && body.trim() && !sending;

  async function refreshScheduled() {
    const { data } = await api.get('/admin/broadcast/scheduled');
    setScheduled(data);
  }

  useEffect(() => {
    refreshScheduled();
  }, []);

  async function send() {
    if (!canSend) return;
    if (scheduledAt) {
      setSending(true);
      setError('');
      try {
        await api.post('/admin/broadcast/schedule', { title: title.trim(), body: body.trim(), audience, scheduledAt });
        toast.success(t('admin.broadcast.scheduledSuccess'));
        setTitle('');
        setBody('');
        setScheduledAt('');
        refreshScheduled();
      } catch (err) {
        setError(err.response?.data?.message || t('admin.broadcast.scheduleFailed'));
      } finally {
        setSending(false);
      }
      return;
    }

    if (!(await confirm(t('admin.broadcast.sendConfirm')))) return;
    setSending(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/admin/broadcast', { title: title.trim(), body: body.trim(), audience });
      setResult(data.sent);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.response?.data?.message || t('admin.broadcast.sendFailed'));
    } finally {
      setSending(false);
    }
  }

  async function cancelScheduled(id) {
    if (!(await confirm(t('admin.broadcast.cancelScheduledConfirm'), { danger: true }))) return;
    await api.delete(`/admin/broadcast/scheduled/${id}`);
    refreshScheduled();
  }

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="max-w-2xl space-y-5 animate-fade-up">
      <div className="card-noir p-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-white/10 border border-accent-300/30 flex items-center justify-center text-accent-300 shrink-0">
          <Megaphone size={24} />
        </span>
        <div>
          <h2 className="text-lg font-extrabold">{t('admin.broadcast.title')}</h2>
          <p className="text-sm text-white/55 mt-0.5">{t('admin.broadcast.subtitle')}</p>
        </div>
      </div>

      <Card className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-ink/50 mb-2">{t('admin.broadcast.audienceLabel')}</label>
          <div className="grid grid-cols-3 gap-2">
            {AUDIENCES.map((a) => {
              const Icon = a.icon;
              const on = audience === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl border transition-all ${
                    on
                      ? 'border-accent-400 bg-accent-50 shadow-accent-glow'
                      : 'border-ink/10 bg-surface-2/50 hover:border-accent-200'
                  }`}
                >
                  <Icon size={20} className={on ? 'text-accent-700' : 'text-ink/40'} />
                  <span className={`text-xs font-bold ${on ? 'text-accent-800' : 'text-ink/60'}`}>{a.label}</span>
                  <span className="text-[10px] text-ink/40">{a.hint}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-ink/50 mb-2">{t('admin.broadcast.titleLabel')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder={t('admin.broadcast.titlePlaceholder')}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-ink/50 mb-2">{t('admin.broadcast.messageLabel')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder={t('admin.broadcast.messagePlaceholder')}
            className="glass-input w-full rounded-xl px-4 py-2.5 text-sm resize-none"
          />
          <p className="text-[11px] text-ink/35 mt-1 text-left">{body.length}/۵۰۰</p>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-bold text-ink/50 mb-2">
            <Clock size={13} />
            {t('admin.broadcast.scheduleLaterLabel')}
          </label>
          <input
            type="datetime-local"
            value={scheduledAt}
            min={minDateTime}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="glass-input rounded-xl px-4 py-2.5 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
        {result !== null && (
          <p className="text-sm text-green-700 bg-green-50 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle2 size={16} />
            {t('admin.broadcast.sentSuccessPrefix')} {n(result)} {t('admin.broadcast.sentSuccessSuffix')}
          </p>
        )}

        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="btn-gold w-full py-3 disabled:opacity-50"
        >
          {scheduledAt ? <Clock size={17} /> : <Send size={17} />}
          {sending ? t('admin.broadcast.processing') : scheduledAt ? t('admin.broadcast.scheduleButton') : t('admin.broadcast.sendButton')}
        </button>
      </Card>

      {scheduled.filter((s) => s.status === 'PENDING').length > 0 && (
        <Card>
          <h3 className="font-bold text-ink text-sm mb-3">{t('admin.broadcast.scheduledListTitle')}</h3>
          <div className="space-y-2">
            {scheduled
              .filter((s) => s.status === 'PENDING')
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-surface-2/50 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{s.title}</p>
                    <p className="text-xs text-ink/45">
                      {date(s.scheduledAt)} — {AUDIENCES.find((a) => a.value === s.audience)?.label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelScheduled(s.id)}
                    className="shrink-0 text-ink/40 hover:text-red-600"
                    aria-label={t('admin.broadcast.cancelAria')}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}
