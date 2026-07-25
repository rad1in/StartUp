import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';

const ENTITY_TYPES = ['VENUE', 'CUSTOMER', 'ORDER'];

export default function InternalTickets() {
  const { t } = useLanguage();
  const PRIORITY_LABELS = { LOW: t('admin.internalTickets.priorityLow'), MEDIUM: t('admin.internalTickets.priorityMedium'), HIGH: t('admin.internalTickets.priorityHigh'), CRITICAL: t('admin.internalTickets.priorityCritical') };
  const PRIORITY_COLORS = {
    LOW: 'bg-gray-100 text-gray-600',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-red-100 text-red-700',
  };
  const STATUS_LABELS = { OPEN: t('admin.internalTickets.statusOpen'), IN_PROGRESS: t('admin.internalTickets.statusInProgress'), RESOLVED: t('admin.internalTickets.statusResolved'), CLOSED: t('admin.internalTickets.statusClosed') };
  const STATUS_COLORS = {
    OPEN: 'bg-red-100 text-red-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    RESOLVED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-100 text-gray-500',
  };

  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '' });
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const commentRef = useRef(null);

  const load = useCallback(async () => {
    const [{ data: t }, { data: s }] = await Promise.all([
      api.get('/admin/tickets', { params: { ...filters, page, limit: 20 } }),
      api.get('/admin/tickets/summary'),
    ]);
    setTickets(t.tickets); setTotal(t.total); setSummary(s);
  }, [filters, page]);

  const loadTicket = useCallback(async (id) => {
    const { data } = await api.get(`/admin/tickets/${id}`);
    setSelected(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  function setFilter(key, val) { setFilters((f) => ({ ...f, [key]: val })); setPage(1); }

  async function updateStatus(ticketId, status) {
    await api.patch(`/admin/tickets/${ticketId}`, { status });
    await Promise.all([load(), selected?.id === ticketId ? loadTicket(ticketId) : Promise.resolve()]);
  }

  async function sendComment(e) {
    e.preventDefault();
    const body = commentRef.current.value.trim();
    if (!body) return;
    await api.post(`/admin/tickets/${selected.id}/comments`, { body });
    commentRef.current.value = '';
    await loadTicket(selected.id);
  }

  async function assignToMe(ticketId) {
    await api.patch(`/admin/tickets/${ticketId}`, { assignedTo: user?.id });
    await Promise.all([load(), selected?.id === ticketId ? loadTicket(ticketId) : Promise.resolve()]);
  }

  return (
    <div className="space-y-5">
      {showCreate && (
        <CreateTicketModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); load(); }} />
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><p className="text-xs text-gray-500">{t('admin.internalTickets.totalTickets')}</p><p className="text-xl font-bold">{Number(summary.total).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">{t('admin.internalTickets.statusOpen')}</p><p className="text-xl font-bold text-red-600">{Number(summary.open).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">{t('admin.internalTickets.statusInProgress')}</p><p className="text-xl font-bold text-yellow-600">{Number(summary.inProgress).toLocaleString('fa-IR')}</p></Card>
          <Card className={summary.overdue > 0 ? 'bg-red-50 border-red-200' : ''}>
            <p className="text-xs text-gray-500">{t('admin.internalTickets.overdue')}</p>
            <p className={`text-xl font-bold ${summary.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {Number(summary.overdue).toLocaleString('fa-IR')}
            </p>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-4">
        {/* Left: ticket list */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('admin.internalTickets.allStatuses')}</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">{t('admin.internalTickets.allPriorities')}</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button onClick={() => setShowCreate(true)}>+ {t('admin.internalTickets.newTicket')}</Button>
          </div>

          <div className="space-y-1.5">
            {tickets.map((tk) => (
              <button
                key={tk.id}
                onClick={() => loadTicket(tk.id)}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  selected?.id === tk.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[tk.priority]}`}>{PRIORITY_LABELS[tk.priority]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[tk.status]}`}>{STATUS_LABELS[tk.status]}</span>
                  {tk.isOverdue > 0 && <span className="px-1.5 py-0.5 rounded text-xs bg-red-200 text-red-800 font-medium">SLA!</span>}
                  {tk.commentCount > 0 && <span className="flex items-center gap-0.5 text-xs text-gray-400 mr-auto"><MessageCircle size={12} />{tk.commentCount}</span>}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{tk.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {tk.assignedToName ? <span className="flex items-center gap-1"><ArrowRight size={12} />{tk.assignedToName}</span> : t('admin.internalTickets.noAssignment')} — {new Date(tk.createdAt).toLocaleDateString('fa-IR')}
                </p>
              </button>
            ))}
            {tickets.length === 0 && <EmptyState icon={MessageCircle} title={t('admin.internalTickets.noTicketsFound')} />}
          </div>

          {total > 20 && (
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>{t('admin.internalTickets.previous')}</Button>
              <Button variant="ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>{t('admin.internalTickets.next')}</Button>
            </div>
          )}
        </div>

        {/* Right: ticket detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className="space-y-4">
              <Card>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex gap-2 flex-wrap mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[selected.priority]}`}>{PRIORITY_LABELS[selected.priority]}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selected.status]}`}>{STATUS_LABELS[selected.status]}</span>
                      {selected.isOverdue > 0 && <span className="px-2 py-0.5 rounded text-xs bg-red-200 text-red-800 font-bold">{t('admin.internalTickets.slaOverdue')}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800">{selected.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {t('admin.internalTickets.createdLabel')}: {selected.createdByName} — {new Date(selected.createdAt).toLocaleString('fa-IR')}
                      {selected.assignedToName && <> | {t('admin.internalTickets.assignedLabel')}: {selected.assignedToName}</>}
                    </p>
                    {selected.linkedEntityType && (
                      <p className="text-xs text-gray-500 mt-1">{t('admin.internalTickets.entityLabel')}: {selected.linkedEntityType} — {selected.linkedEntityId}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!selected.assignedToName && <Button variant="ghost" onClick={() => assignToMe(selected.id)}>{t('admin.internalTickets.assignToMe')}</Button>}
                    {selected.status === 'OPEN' && <Button variant="secondary" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}>{t('admin.internalTickets.startReview')}</Button>}
                    {selected.status === 'IN_PROGRESS' && <Button variant="secondary" onClick={() => updateStatus(selected.id, 'RESOLVED')}>{t('admin.internalTickets.markResolved')}</Button>}
                    {selected.status === 'RESOLVED' && <Button variant="ghost" onClick={() => updateStatus(selected.id, 'CLOSED')}>{t('common.close')}</Button>}
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</div>
              </Card>

              {/* Comments */}
              <Card>
                <h4 className="font-semibold text-gray-800 mb-3">{t('admin.internalTickets.internalComments')} ({selected.comments?.length || 0})</h4>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {(selected.comments || []).map((c) => (
                    <div key={c.id} className={`p-3 rounded-lg text-sm ${c.authorId === user?.id ? 'bg-primary-50 mr-6' : 'bg-gray-50 ml-6'}`}>
                      <p className="text-xs text-gray-400 mb-1">{c.authorName} ({c.authorRole}) — {new Date(c.createdAt).toLocaleString('fa-IR')}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                  {selected.comments?.length === 0 && <p className="text-gray-400 text-sm">{t('admin.internalTickets.noCommentsYet')}</p>}
                </div>
                <form onSubmit={sendComment} className="flex gap-2">
                  <textarea ref={commentRef} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder={t('admin.internalTickets.internalNotePlaceholder')} />
                  <Button type="submit">{t('admin.internalTickets.send')}</Button>
                </form>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              {t('admin.internalTickets.selectTicketHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTicketModal({ onClose, onDone }) {
  const { t } = useLanguage();
  const PRIORITY_LABELS = { LOW: t('admin.internalTickets.priorityLow'), MEDIUM: t('admin.internalTickets.priorityMedium'), HIGH: t('admin.internalTickets.priorityHigh'), CRITICAL: t('admin.internalTickets.priorityCritical') };
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', linkedEntityType: '', linkedEntityId: '', slaHours: 24 });
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try { await api.post('/admin/tickets', form); onDone(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-4">{t('admin.internalTickets.createInternalTicket')}</h3>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.internalTickets.ticketTitlePlaceholder')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={4} placeholder={t('admin.internalTickets.descriptionPlaceholder')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" min="1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.internalTickets.slaHoursPlaceholder')} value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.linkedEntityType} onChange={(e) => setForm({ ...form, linkedEntityType: e.target.value })}>
              <option value="">{t('admin.internalTickets.linkedEntityOptional')}</option>
              {ENTITY_TYPES.map((t2) => <option key={t2} value={t2}>{t2}</option>)}
            </select>
            {form.linkedEntityType && (
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={t('admin.internalTickets.entityIdPlaceholder')} value={form.linkedEntityId} onChange={(e) => setForm({ ...form, linkedEntityId: e.target.value })} />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>{t('admin.internalTickets.createTicket')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
