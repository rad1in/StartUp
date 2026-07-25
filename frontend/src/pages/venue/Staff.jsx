import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const PERMISSION_LABELS = {
  'orders.view': 'مشاهده سفارش‌ها',
  'orders.manage': 'مدیریت سفارش‌ها',
  'tables.view': 'مشاهده میزها',
  'menu.manage': 'مدیریت منو',
  'accounting.view': 'مشاهده حسابداری',
  'staff.manage': 'مدیریت کارمندان',
  'settings.manage': 'مدیریت تنظیمات',
  'marketing.manage': 'مدیریت بازاریابی',
  'feedback.manage': 'مدیریت بازخوردها',
};

export default function Staff() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const confirm = useConfirm();
  const [catalogue, setCatalogue] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', permissions: [] });

  async function refresh() {
    const [{ data: cat }, { data: staffList }] = await Promise.all([
      api.get(`/venues/${venueId}/staff/permissions-catalogue`),
      api.get(`/venues/${venueId}/staff`),
    ]);
    setCatalogue(cat.permissions);
    setStaff(staffList);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  function toggleFormPermission(permission) {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  }

  async function createStaff(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    await api.post(`/venues/${venueId}/staff`, form);
    setForm({ name: '', email: '', phone: '', password: '', permissions: [] });
    refresh();
  }

  async function togglePermission(member, permission) {
    const has = member.permissions.includes(permission);
    const nextPermissions = has
      ? member.permissions.filter((p) => p !== permission)
      : [...member.permissions, permission];
    await api.patch(`/venues/${venueId}/staff/${member.id}/permissions`, { permissions: nextPermissions });
    refresh();
  }

  async function removeStaff(member) {
    if (!(await confirm(`کارمند «${member.name}» حذف شود؟`, { danger: true }))) return;
    await api.delete(`/venues/${venueId}/staff/${member.id}`);
    refresh();
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">افزودن کارمند جدید</h3>
        <form onSubmit={createStaff} className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="نام و نام خانوادگی"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="email"
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="ایمیل"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="شماره موبایل (اختیاری)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              type="password"
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="رمز عبور اولیه"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-2">دسترسی‌ها:</p>
            <div className="flex flex-wrap gap-2">
              {catalogue.map((permission) => (
                <label
                  key={permission}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    form.permissions.includes(permission)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.permissions.includes(permission)}
                    onChange={() => toggleFormPermission(permission)}
                  />
                  {PERMISSION_LABELS[permission] || permission}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">افزودن کارمند</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {staff.map((member) => (
          <Card key={member.id}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-gray-800">{member.name}</p>
                <p className="text-xs text-gray-500">{member.email}</p>
              </div>
              <Button variant="danger" onClick={() => removeStaff(member)}>
                حذف کارمند
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {catalogue.map((permission) => (
                <label
                  key={permission}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    member.permissions.includes(permission)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={member.permissions.includes(permission)}
                    onChange={() => togglePermission(member, permission)}
                  />
                  {PERMISSION_LABELS[permission] || permission}
                </label>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
