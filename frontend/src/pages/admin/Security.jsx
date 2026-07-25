import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useConfirm } from '../../context/ConfirmContext';

export default function Security() {
  const confirm = useConfirm();
  const [health, setHealth] = useState(null);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get('/admin/system-health').then(({ data }) => setHealth(data));
  }, []);

  async function searchUsers() {
    const [{ data: customers }, { data: allUsers }] = await Promise.all([
      api.get('/admin/customers', { params: { search } }),
      api.get('/admin/users'),
    ]);
    const filteredStaff = allUsers.filter(
      (u) => u.name?.includes(search) || u.email?.includes(search)
    );
    setUsers([...customers, ...filteredStaff.filter((u) => !customers.some((c) => c.id === u.id))]);
  }

  async function viewSessions(user) {
    setSelectedUser(user);
    const { data } = await api.get(`/admin/users/${user.id}/sessions`);
    setSessions(data);
  }

  async function forceLogout(user) {
    if (!(await confirm(`تمام نشست‌های «${user.name}» خاتمه یابد؟`, { danger: true }))) return;
    await api.post(`/admin/users/${user.id}/force-logout`);
    if (selectedUser?.id === user.id) viewSessions(user);
  }

  return (
    <div className="space-y-6">
      {health && (
        <div className="grid sm:grid-cols-3 gap-3">
          <Card>
            <p className="text-xs text-gray-500">خطاهای API (۲۴ ساعت اخیر)</p>
            <p className="text-xl font-bold text-gray-800">{health.apiErrorsLast24h.toLocaleString('fa-IR')}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">نرخ شکست پرداخت</p>
            <p className="text-xl font-bold text-gray-800">{(health.failedPaymentRate * 100).toFixed(1)}٪</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">اتصالات زنده (WebSocket)</p>
            <p className="text-xl font-bold text-primary-700">{health.connectedSockets.toLocaleString('fa-IR')}</p>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">جستجوی کاربر و خروج اجباری</h3>
        <div className="flex gap-2 mb-3">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            placeholder="نام یا ایمیل کاربر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button onClick={searchUsers}>جستجو</Button>
        </div>
        <div className="space-y-2">
          {users.map((user) => (
            <div key={user.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
              <span>{user.name} ({user.email})</span>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => viewSessions(user)}>
                  مشاهده نشست‌ها
                </Button>
                <Button variant="danger" onClick={() => forceLogout(user)}>
                  خروج اجباری
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedUser && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">نشست‌های فعال {selectedUser.name}</h3>
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="text-sm border-b border-gray-100 pb-1">
                <p className="text-gray-700">{session.userAgent || 'دستگاه نامشخص'} — {session.ip || '—'}</p>
                <p className="text-xs text-gray-400">آخرین استفاده: {new Date(session.lastUsedAt).toLocaleString('fa-IR')}</p>
              </div>
            ))}
            {sessions.length === 0 && <p className="text-gray-500 text-sm">نشست فعالی یافت نشد.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
