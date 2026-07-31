import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Clock, Lock, Paperclip } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { resolveImageUrl } from '../../components/VenueCards';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import { useAdminSocket } from '../../hooks/useSocket';

export default function AdminSupport() {
  const { t, date, dateShort } = useLanguage();
  const DEPARTMENT_LABEL = { MANAGEMENT: t('admin.support.deptManagement'), SALES: t('admin.support.deptSales'), TECHNICAL: t('admin.support.deptTechnical') };
  const STATUS_LABEL = { OPEN: t('admin.support.statusOpen'), RESOLVED: t('admin.support.statusResolved') };

  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ department: '', status: '' });
  const [selectedId, setSelectedId] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await api.get('/support/admin/tickets', { params: filters });
    setTickets(data);
  }, [filters]);

  const loadTicket = useCallback(async (id) => {
    const { data } = await api.get(`/support/tickets/${id}`);
    setTicket(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedId) loadTicket(selectedId);
  }, [selectedId, loadTicket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  // useAdminSocket only subscribes once (mount), so the handler below must
  // read the current selectedId/loadTicket through a ref instead of closing
  // over them directly, or it'd keep reacting to whichever ticket was open
  // when the socket first connected.
  const liveRef = useRef({ selectedId, loadTicket, load });
  liveRef.current = { selectedId, loadTicket, load };

  useAdminSocket({
    'support:update': (payload) => {
      const { selectedId: currentId, loadTicket: currentLoadTicket, load: currentLoad } = liveRef.current;
      currentLoad();
      if (payload?.ticketId === currentId) currentLoadTicket(currentId);
    },
  });

  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() && files.length === 0) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('body', reply);
      formData.append('isConfidential', confidential);
      files.forEach((f) => formData.append('attachments', f));
      await api.post(`/support/tickets/${selectedId}/messages`, formData);
      setReply('');
      setFiles([]);
      setConfidential(false);
      await Promise.all([loadTicket(selectedId), load()]);
    } finally {
      setSending(false);
    }
  }

  async function resolveTicket() {
    await api.patch(`/support/tickets/${selectedId}/status`, { status: 'RESOLVED' });
    await Promise.all([loadTicket(selectedId), load()]);
  }

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center gap-2">
          <select
            value={filters.department}
            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">{t('admin.support.allDepartments')}</option>
            {Object.entries(DEPARTMENT_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value="">{t('admin.support.allStatuses')}</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          {tickets.map((tk) => (
            <button
              key={tk.id}
              onClick={() => setSelectedId(tk.id)}
              className={`w-full text-right p-3 rounded-lg border transition-colors ${
                selectedId === tk.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  {DEPARTMENT_LABEL[tk.department]}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${
                    tk.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}
                >
                  {STATUS_LABEL[tk.status]}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-800 truncate">{tk.subject}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {tk.customerName} — {dateShort(tk.createdAt)}
              </p>
            </button>
          ))}
          {tickets.length === 0 && <EmptyState icon={Clock} title={t('admin.support.noTicketsFound')} />}
        </div>
      </div>

      <div className="lg:col-span-3">
        {ticket ? (
          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-ink">{ticket.subject}</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {DEPARTMENT_LABEL[ticket.department]} · {STATUS_LABEL[ticket.status]}
                </p>
              </div>
              {ticket.status === 'OPEN' && (
                <Button variant="secondary" onClick={resolveTicket}>
                  <CheckCircle size={14} className="ml-1 inline" /> {t('admin.support.markResolved')}
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
                    {m.senderName} ({m.senderRole}) — {date(m.createdAt)}
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
                  placeholder={t('admin.support.writeYourReplyPlaceholder')}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                />
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                      <Paperclip size={14} />
                      {t('admin.support.attachment')}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 3))}
                      />
                    </label>
                    {files.length > 0 && <span className="text-xs text-gray-400">{files.length} {t('admin.support.fileWord')}</span>}
                    <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={confidential} onChange={(e) => setConfidential(e.target.checked)} />
                      <Lock size={12} className={confidential ? 'text-primary-700' : 'text-gray-400'} /> {t('admin.support.confidential')}
                    </label>
                  </div>
                  <Button type="submit" disabled={sending}>
                    {sending ? t('admin.support.sending') : t('admin.internalTickets.send')}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
            {t('admin.internalTickets.selectTicketHint')}
          </div>
        )}
      </div>
    </div>
  );
}
