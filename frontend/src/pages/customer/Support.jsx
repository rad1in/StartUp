import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock, Paperclip, Lock, Plus, ArrowRight, Building2, Wrench, BadgePercent } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { resolveImageUrl } from '../../components/VenueCards';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

function buildDepartments(t) {
  return [
    { key: 'MANAGEMENT', label: t('support.deptManagement'), icon: Building2 },
    { key: 'SALES', label: t('support.deptSales'), icon: BadgePercent },
    { key: 'TECHNICAL', label: t('support.deptTechnical'), icon: Wrench },
  ];
}

function statusLabel(t, status) {
  return status === 'OPEN' ? t('support.statusOpen') : t('support.statusResolved');
}

export default function Support() {
  const { t } = useLanguage();
  const DEPARTMENTS = buildDepartments(t);
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [faqItems, setFaqItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    const { data } = await api.get('/support/tickets');
    setTickets(data);
  }

  useEffect(() => {
    refresh();
    api.get('/content/faq').then(({ data }) => setFaqItems(data));
    if (searchParams.get('orderId')) setCreating(true);
  }, [searchParams]);

  return (
    <div className="max-w-2xl space-y-6">
      {creating && (
        <NewTicketPanel
          defaultOrderId={searchParams.get('orderId') || ''}
          onClose={() => setCreating(false)}
          onCreated={(ticket) => {
            setCreating(false);
            refresh();
            setSelectedId(ticket.id);
          }}
        />
      )}

      {selectedId ? (
        <TicketThread
          ticketId={selectedId}
          onBack={() => {
            setSelectedId(null);
            refresh();
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-ink text-lg">{t('support.title')}</h3>
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} className="ml-1 inline" /> {t('support.newTicket')}
            </Button>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">{t('support.myTickets')}</h4>
            {tickets.length === 0 && <p className="text-gray-500 text-sm">{t('support.noTickets')}</p>}
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button key={ticket.id} onClick={() => setSelectedId(ticket.id)} className="w-full text-right">
                  <Card className="flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{ticket.subject}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {DEPARTMENTS.find((d) => d.key === ticket.department)?.label || ticket.department} ·{' '}
                        {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        ticket.status === 'OPEN' ? 'border border-dashed border-gray-400 text-ink/60' : 'bg-primary-800 text-white'
                      }`}
                    >
                      {ticket.status === 'OPEN' ? <Clock size={11} /> : <CheckCircle size={11} />}
                      {statusLabel(t, ticket.status)}
                    </span>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-2 text-sm">{t('support.faq')}</h4>
            <div className="space-y-2">
              {faqItems.map((faq) => (
                <Card key={faq.question}>
                  <p className="font-medium text-gray-800 text-sm">{faq.question}</p>
                  <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NewTicketPanel({ defaultOrderId, onClose, onCreated }) {
  const { t } = useLanguage();
  const DEPARTMENTS = buildDepartments(t);
  const [department, setDepartment] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!department) return;
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('department', department);
      formData.append('message', message);
      formData.append('isConfidential', confidential);
      files.forEach((f) => formData.append('attachments', f));
      const { data } = await api.post('/support/tickets', formData);
      onCreated(data);
    } catch (err) {
      setError(err.response?.data?.message || t('support.submitError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="border-2 border-primary-800">
      <h3 className="font-bold text-ink mb-4">{t('support.newTicket')}</h3>

      {!department ? (
        <div>
          <p className="text-sm text-gray-500 mb-3">{t('support.whichDepartment')}</p>
          <div className="grid grid-cols-3 gap-2">
            {DEPARTMENTS.map((d) => {
              const Icon = d.icon;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDepartment(d.key)}
                  className="flex flex-col items-center gap-2 border border-gray-200 rounded-xl py-4 hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <Icon size={20} className="text-primary-700" />
                  <span className="text-sm font-medium text-gray-700">{d.label}</span>
                </button>
              );
            })}
          </div>
          <Button variant="ghost" onClick={onClose} className="mt-3">
            {t('account.cancel')}
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span>{t('support.departmentPrefix')} {DEPARTMENTS.find((d) => d.key === department)?.label}</span>
            <button type="button" onClick={() => setDepartment(null)} className="text-primary-700 underline">
              {t('support.change')}
            </button>
          </div>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('support.subjectPlaceholder')}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('support.messagePlaceholder')}
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          {defaultOrderId && <p className="text-xs text-gray-400">{t('support.relatedOrderPrefix')} {defaultOrderId}</p>}

          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <Paperclip size={16} />
            {t('support.attachHint')}
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 3))}
            />
          </label>
          {files.length > 0 && <p className="text-xs text-gray-500">{files.map((f) => f.name).join('، ')}</p>}

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
            <Lock size={14} className={confidential ? 'text-primary-700' : 'text-gray-400'} />
            {t('support.confidentialLabel')}
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? t('account.sending') : t('support.submitTicket')}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('account.cancel')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function TicketThread({ ticketId, onBack }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const DEPARTMENTS = buildDepartments(t);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  async function load() {
    const { data } = await api.get(`/support/tickets/${ticketId}`);
    setTicket(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('body', reply);
      formData.append('isConfidential', confidential);
      files.forEach((f) => formData.append('attachments', f));
      await api.post(`/support/tickets/${ticketId}/messages`, formData);
      setReply('');
      setFiles([]);
      setConfidential(false);
      await load();
    } finally {
      setSending(false);
    }
  }

  async function resolve() {
    await api.patch(`/support/tickets/${ticketId}/status`, { status: 'RESOLVED' });
    await load();
  }

  if (!ticket) return <p className="text-gray-500 text-sm">{t('account.loading')}</p>;

  return (
    <Card>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary-700 mb-3">
        <ArrowRight size={16} /> {t('support.backToTickets')}
      </button>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-ink">{ticket.subject}</h3>
          <p className="text-xs text-gray-400 mt-1">
            {DEPARTMENTS.find((d) => d.key === ticket.department)?.label} · {statusLabel(t, ticket.status)}
          </p>
        </div>
        {ticket.status === 'OPEN' && (
          <Button variant="secondary" onClick={resolve}>
            {t('support.closeTicket')}
          </Button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto mb-4 border border-gray-100 rounded-lg p-3">
        {ticket.messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-lg text-sm max-w-[85%] ${
              m.senderId === user?.id ? 'bg-primary-50 mr-auto' : 'bg-gray-50 ml-auto'
            }`}
          >
            <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
              {m.senderName} — {new Date(m.createdAt).toLocaleString('fa-IR')}
              {!!m.isConfidential && <Lock size={11} className="text-primary-700" />}
            </p>
            {m.body && <p className="text-gray-700 whitespace-pre-wrap">{m.body}</p>}
            {m.attachments?.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {m.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={resolveImageUrl(a.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary-700 underline flex items-center gap-1"
                  >
                    <Paperclip size={11} /> {a.fileName}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {ticket.status === 'OPEN' && (
        <form onSubmit={sendReply} className="space-y-2">
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            rows={2}
            placeholder={t('support.replyPlaceholder')}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <Paperclip size={14} />
                {t('support.attach')}
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 3))}
                />
              </label>
              {files.length > 0 && <span className="text-xs text-gray-400">{files.length} {t('support.filesSuffix')}</span>}
              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
                <Lock size={12} className={confidential ? 'text-primary-700' : 'text-gray-400'} /> {t('support.confidentialShort')}
              </label>
            </div>
            <Button type="submit" disabled={sending}>
              {sending ? t('account.sending') : t('support.send')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
