import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../hooks/useAuth';

const PRIORITY_LABELS = { LOW: 'پایین', MEDIUM: 'متوسط', HIGH: 'بالا', CRITICAL: 'بحرانی' };
const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  CRITICAL: 'bg-red-100 text-red-700',
};
const STATUS_LABELS = { OPEN: 'باز', IN_PROGRESS: 'در حال بررسی', RESOLVED: 'حل شده', CLOSED: 'بسته' };
const STATUS_COLORS = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};
const ENTITY_TYPES = ['VENUE', 'CUSTOMER', 'ORDER'];

export default function InternalTickets() {
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
          <Card><p className="text-xs text-gray-500">کل تیکت‌ها</p><p className="text-xl font-bold">{Number(summary.total).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">باز</p><p className="text-xl font-bold text-red-600">{Number(summary.open).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">در حال بررسی</p><p className="text-xl font-bold text-yellow-600">{Number(summary.inProgress).toLocaleString('fa-IR')}</p></Card>
          <Card className={summary.overdue > 0 ? 'bg-red-50 border-red-200' : ''}>
            <p className="text-xs text-gray-500">سررسید گذشته</p>
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
              <option value="">همه وضعیت‌ها</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm">
              <option value="">همه اولویت‌ها</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <Button onClick={() => setShowCreate(true)}>+ تیکت جدید</Button>
          </div>

          <div className="space-y-1.5">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => loadTicket(t.id)}
                className={`w-full text-right p-3 rounded-lg border transition-colors ${
                  selected?.id === t.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{PRIORITY_LABELS[t.priority]}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  {t.isOverdue > 0 && <span className="px-1.5 py-0.5 rounded text-xs bg-red-200 text-red-800 font-medium">SLA!</span>}
                  {t.commentCount > 0 && <span className="flex items-center gap-0.5 text-xs text-gray-400 mr-auto"><MessageCircle size={12} />{t.commentCount}</span>}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.assignedToName ? <span className="flex items-center gap-1"><ArrowRight size={12} />{t.assignedToName}</span> : 'بدون تخصیص'} — {new Date(t.createdAt).toLocaleDateString('fa-IR')}
                </p>
              </button>
            ))}
            {tickets.length === 0 && <EmptyState icon={MessageCircle} title="تیکتی یافت نشد" />}
          </div>

          {total > 20 && (
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>قبلی</Button>
              <Button variant="ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>بعدی</Button>
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
                      {selected.isOverdue > 0 && <span className="px-2 py-0.5 rounded text-xs bg-red-200 text-red-800 font-bold">SLA سررسید گذشته</span>}
                    </div>
                    <h3 className="font-semibold text-gray-800">{selected.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      ایجاد: {selected.createdByName} — {new Date(selected.createdAt).toLocaleString('fa-IR')}
                      {selected.assignedToName && <> | تخصیص: {selected.assignedToName}</>}
                    </p>
                    {selected.linkedEntityType && (
                      <p className="text-xs text-gray-500 mt-1">موجودیت: {selected.linkedEntityType} — {selected.linkedEntityId}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {!selected.assignedToName && <Button variant="ghost" onClick={() => assignToMe(selected.id)}>تخصیص به من</Button>}
                    {selected.status === 'OPEN' && <Button variant="secondary" onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}>شروع بررسی</Button>}
                    {selected.status === 'IN_PROGRESS' && <Button variant="secondary" onClick={() => updateStatus(selected.id, 'RESOLVED')}>حل شد</Button>}
                    {selected.status === 'RESOLVED' && <Button variant="ghost" onClick={() => updateStatus(selected.id, 'CLOSED')}>بستن</Button>}
                  </div>
                </div>
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap">{selected.description}</div>
              </Card>

              {/* Comments */}
              <Card>
                <h4 className="font-semibold text-gray-800 mb-3">تبادل نظر داخلی ({selected.comments?.length || 0})</h4>
                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {(selected.comments || []).map((c) => (
                    <div key={c.id} className={`p-3 rounded-lg text-sm ${c.authorId === user?.id ? 'bg-primary-50 mr-6' : 'bg-gray-50 ml-6'}`}>
                      <p className="text-xs text-gray-400 mb-1">{c.authorName} ({c.authorRole}) — {new Date(c.createdAt).toLocaleString('fa-IR')}</p>
                      <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                  {selected.comments?.length === 0 && <p className="text-gray-400 text-sm">هنوز نظری ثبت نشده.</p>}
                </div>
                <form onSubmit={sendComment} className="flex gap-2">
                  <textarea ref={commentRef} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" rows={2} placeholder="یادداشت داخلی..." />
                  <Button type="submit">ارسال</Button>
                </form>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
              یک تیکت انتخاب کنید تا جزئیات نمایش داده شود.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTicketModal({ onClose, onDone }) {
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
        <h3 className="font-semibold text-gray-800 mb-4">ایجاد تیکت داخلی</h3>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="عنوان تیکت" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={4} placeholder="توضیحات" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="number" min="1" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="SLA (ساعت)" value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={form.linkedEntityType} onChange={(e) => setForm({ ...form, linkedEntityType: e.target.value })}>
              <option value="">موجودیت مرتبط (اختیاری)</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {form.linkedEntityType && (
              <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="شناسه موجودیت" value={form.linkedEntityId} onChange={(e) => setForm({ ...form, linkedEntityId: e.target.value })} />
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={saving}>ایجاد تیکت</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
