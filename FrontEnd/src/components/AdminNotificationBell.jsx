import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAdminSocket } from '../hooks/useSocket';
import { useLanguage } from '../context/LanguageContext';

const SEVERITY_ICON = { INFO: Info, WARNING: AlertCircle, CRITICAL: AlertTriangle };
const SEVERITY_COLOR = {
  INFO: 'text-accent-600 bg-accent-100',
  WARNING: 'text-yellow-600 bg-yellow-100',
  CRITICAL: 'text-red-600 bg-red-100',
};

export default function AdminNotificationBell() {
  const { t, date } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);

  async function refresh() {
    const [{ data: list }, { data: countData }] = await Promise.all([
      api.get('/admin/notifications'),
      api.get('/admin/notifications/unread-count'),
    ]);
    setItems(list);
    setUnread(countData.count);
  }

  useEffect(() => {
    refresh();
  }, []);

  useAdminSocket({
    'admin-notification:new': () => refresh(),
  });

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function markAllRead() {
    await api.patch('/admin/notifications/read-all');
    refresh();
  }

  async function markRead(id) {
    await api.patch(`/admin/notifications/${id}/read`);
    refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="glass w-10 h-10 rounded-full flex items-center justify-center text-ink relative shrink-0"
        aria-label={t('components.adminNotificationBell.ariaLabel')}
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 bg-gradient-to-b from-red-500 to-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 max-h-[26rem] overflow-y-auto glass-strong rounded-2xl shadow-lift z-50 animate-pop-in" dir="rtl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/10">
            <p className="font-bold text-ink text-sm">{t('components.adminNotificationBell.title')}</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="text-xs text-accent-600 hover:underline">
                {t('components.adminNotificationBell.markAllRead')}
              </button>
            )}
          </div>
          {items.length === 0 ? (
            <p className="text-xs text-ink/40 text-center py-8">{t('components.adminNotificationBell.empty')}</p>
          ) : (
            <div className="divide-y divide-ink/5">
              {items.map((n) => {
                const Icon = SEVERITY_ICON[n.severity] || Info;
                const content = (
                  <div
                    className={`px-4 py-3 flex items-start gap-2.5 hover:bg-black/[0.03] cursor-pointer ${!n.isRead ? 'bg-accent-50/40' : ''}`}
                    onClick={() => !n.isRead && markRead(n.id)}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${SEVERITY_COLOR[n.severity] || SEVERITY_COLOR.INFO}`}>
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{n.title}</p>
                      {n.body && <p className="text-[11px] text-ink/50 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] text-ink/35 mt-1">{date(n.createdAt)}</p>
                    </div>
                  </div>
                );
                return n.link ? (
                  <Link key={n.id} to={n.link} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
