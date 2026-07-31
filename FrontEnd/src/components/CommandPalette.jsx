import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Store, User, LayoutDashboard, ArrowLeft, Command } from 'lucide-react';
import api from '../services/api';

// Static admin destinations, searchable by their Persian labels.
const PAGES = [
  { label: 'داشبورد', to: '/admin', keywords: 'خانه اصلی' },
  { label: 'مجموعه‌ها', to: '/admin/venues', keywords: 'کافه رستوران venue' },
  { label: 'مشتریان', to: '/admin/customers', keywords: 'کاربر customer' },
  { label: 'اعلان همگانی', to: '/admin/broadcast', keywords: 'پیام broadcast اطلاع رسانی' },
  { label: 'مالی و صورتحساب', to: '/admin/billing', keywords: 'پرداخت payout' },
  { label: 'حسابداری پلتفرم', to: '/admin/platform-accounting', keywords: 'مالی' },
  { label: 'گزارش‌ها', to: '/admin/reports', keywords: 'report آمار' },
  { label: 'هوش تجاری (BI)', to: '/admin/bi', keywords: 'analytics' },
  { label: 'گیمیفیکیشن', to: '/admin/gamification', keywords: 'نشان جایزه' },
  { label: 'محتوا', to: '/admin/content', keywords: 'بنر صفحه' },
  { label: 'یکپارچه‌سازی‌ها', to: '/admin/integrations', keywords: 'webhook api' },
  { label: 'امنیت', to: '/admin/security', keywords: 'security session' },
  { label: 'گزارش رویدادها', to: '/admin/audit-log', keywords: 'audit log' },
  { label: 'تشخیص تقلب', to: '/admin/fraud', keywords: 'fraud' },
  { label: 'تیکت‌های داخلی', to: '/admin/tickets', keywords: 'support' },
  { label: 'کارمندان پلتفرم', to: '/admin/staff', keywords: 'staff' },
  { label: 'مدیریت پلن‌ها', to: '/admin/plan-config', keywords: 'plan اشتراک' },
];

// ⌘K / Ctrl+K global command palette for the admin panel: fuzzy-navigate to any
// page and live-search venues + customers from one keyboard-driven surface.
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState({ venues: [], customers: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setRemote({ venues: [], customers: [] });
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Debounced remote search once the query is long enough.
  useEffect(() => {
    if (query.trim().length < 2) {
      setRemote({ venues: [], customers: [] });
      return;
    }
    const t = setTimeout(() => {
      api
        .get('/admin/search', { params: { q: query.trim() } })
        .then(({ data }) => setRemote(data))
        .catch(() => setRemote({ venues: [], customers: [] }));
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const pageMatches = useMemo(() => {
    const q = query.trim();
    if (!q) return PAGES.slice(0, 6);
    return PAGES.filter((p) => (p.label + ' ' + p.keywords).includes(q)).slice(0, 6);
  }, [query]);

  // Flatten everything into one selectable list for keyboard nav.
  const items = useMemo(() => {
    const list = [];
    pageMatches.forEach((p) => list.push({ kind: 'page', label: p.label, to: p.to }));
    remote.venues.forEach((v) =>
      list.push({ kind: 'venue', label: v.name, sub: `${v.city} · ${v.status}`, to: `/admin/venues/${v.id}` })
    );
    remote.customers.forEach((c) =>
      list.push({ kind: 'customer', label: c.name, sub: c.email, to: `/admin/customers/${c.id}` })
    );
    return list;
  }, [pageMatches, remote]);

  useEffect(() => setActive(0), [items.length]);

  if (!open) return null;

  const go = (item) => {
    if (!item) return;
    navigate(item.to);
    setOpen(false);
  };

  const onInputKey = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(items[active]);
    }
  };

  const iconFor = (kind) =>
    kind === 'venue' ? <Store size={16} /> : kind === 'customer' ? <User size={16} /> : <LayoutDashboard size={16} />;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4" onMouseDown={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl card-luxe overflow-hidden animate-pop-in"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-black/5">
          <Search size={18} className="text-ink/40 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="جستجوی مجموعه، مشتری یا صفحه…"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink/35"
          />
          <span className="chip-gold text-[10px] py-0.5">ESC</span>
        </div>

        <div className="max-h-[52vh] overflow-y-auto py-2">
          {items.length === 0 && (
            <p className="text-center text-sm text-ink/40 py-8">نتیجه‌ای یافت نشد.</p>
          )}
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.to}-${i}`}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-right transition-colors ${
                active === i ? 'bg-accent-50' : 'hover:bg-black/[0.03]'
              }`}
            >
              <span
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  item.kind === 'page' ? 'bg-primary-100 text-primary-600' : 'bg-accent-100 text-accent-700'
                }`}
              >
                {iconFor(item.kind)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink truncate">{item.label}</span>
                {item.sub && <span className="block text-[11px] text-ink/45 truncate">{item.sub}</span>}
              </span>
              {active === i && <ArrowLeft size={15} className="text-ink/30 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-black/5 text-[11px] text-ink/40 bg-surface-2/40">
          <span className="flex items-center gap-1">
            <Command size={12} /> جستجوی سراسری پلتفرم
          </span>
          <span>↑↓ حرکت · Enter انتخاب</span>
        </div>
      </div>
    </div>
  );
}
