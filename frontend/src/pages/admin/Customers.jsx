import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Users, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { SkeletonRows } from '../../components/SkeletonBlock';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useDensity } from '../../context/DensityContext';

export default function Customers() {
  const confirm = useConfirm();
  const toast = useToast();
  const { dense } = useDensity();
  const [customers, setCustomers] = useState([]);
  const [filters, setFilters] = useState({ search: '', isSuspended: '' });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState({ key: 'name', dir: 'asc' });

  async function refresh() {
    setLoading(true);
    const params = {};
    if (filters.search) params.search = filters.search;
    if (filters.isSuspended) params.isSuspended = filters.isSuspended;
    const { data } = await api.get('/admin/customers', { params });
    setCustomers(data);
    setSelected(new Set());
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleSuspension(customer) {
    const action = customer.isSuspended ? 'reactivate' : 'suspend';
    const reason = action === 'suspend' ? window.prompt('دلیل مسدودسازی (اختیاری):') || undefined : undefined;
    await api.patch(`/admin/customers/${customer.id}/${action}`, { reason });
    refresh();
  }

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  }

  const sorted = useMemo(() => {
    const list = [...customers];
    list.sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv), 'fa');
      return sort.dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [customers, sort]);

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((c) => c.id))));
  }

  async function bulkSuspend(suspend) {
    if (selected.size === 0) return;
    const label = suspend ? 'مسدود' : 'فعال';
    if (!(await confirm(`${selected.size} مشتری انتخاب‌شده ${label} شوند؟`, { danger: suspend }))) return;
    await Promise.all(
      [...selected].map((id) => api.patch(`/admin/customers/${id}/${suspend ? 'suspend' : 'reactivate'}`, {}))
    );
    toast.success(`${selected.size} مشتری ${label} شدند.`);
    refresh();
  }

  const SortHeader = ({ label, sortKey }) => (
    <button
      type="button"
      onClick={() => toggleSort(sortKey)}
      className={`inline-flex items-center gap-1 text-xs font-bold ${sort.key === sortKey ? 'text-accent-600' : 'text-ink/40'}`}
    >
      {label}
      <ArrowUpDown size={11} />
    </button>
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="جستجوی نام یا ایمیل..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.isSuspended}
            onChange={(e) => setFilters((f) => ({ ...f, isSuspended: e.target.value }))}
          >
            <option value="">همه مشتریان</option>
            <option value="false">فعال</option>
            <option value="true">مسدود شده</option>
          </select>
          <Button onClick={refresh}>اعمال فیلتر</Button>
        </div>
      </Card>

      <div className="flex items-center justify-between flex-wrap gap-2 px-1">
        <button type="button" onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs text-ink/50 hover:text-ink">
          {selected.size > 0 && selected.size === sorted.length ? <CheckSquare size={14} /> : <Square size={14} />}
          {selected.size > 0 ? `${selected.size.toLocaleString('fa-IR')} انتخاب شده` : 'انتخاب همه'}
        </button>
        <div className="flex items-center gap-3">
          <SortHeader label="نام" sortKey="name" />
          <SortHeader label="امتیاز وفاداری" sortKey="loyaltyPoints" />
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => bulkSuspend(false)}>فعال‌سازی گروهی</Button>
            <Button variant="danger" onClick={() => bulkSuspend(true)}>مسدودسازی گروهی</Button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonRows rows={5} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Users} title="مشتری‌ای یافت نشد" hint="فیلترها را تغییر دهید یا جستجوی دیگری امتحان کنید." />
      ) : (
        <div className={dense ? 'space-y-1.5' : 'space-y-3'}>
          {sorted.map((customer) => (
            <Card
              key={customer.id}
              className={`flex items-center justify-between flex-wrap gap-3 ${dense ? '!p-2.5' : ''}`}
            >
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => toggleSelect(customer.id)} className="text-ink/40 hover:text-accent-600 shrink-0">
                  {selected.has(customer.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/admin/customers/${customer.id}`} className="font-medium text-gray-800 hover:underline">
                      {customer.name}
                    </Link>
                    {!!customer.isSuspended && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border-2 border-primary-800 text-ink"><Ban size={11} />مسدود</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{customer.email} — {customer.loyaltyPoints} امتیاز</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/admin/customers/${customer.id}`}>
                  <Button variant="ghost">جزئیات</Button>
                </Link>
                <Button variant={customer.isSuspended ? 'primary' : 'danger'} onClick={() => toggleSuspension(customer)}>
                  {customer.isSuspended ? 'فعال‌سازی مجدد' : 'مسدودسازی'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
