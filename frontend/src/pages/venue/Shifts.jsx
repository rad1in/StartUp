import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenuePermissions } from '../../hooks/useVenuePermissions';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Shifts() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const { has, isOwner, loading: permsLoading } = useVenuePermissions();
  const confirm = useConfirm();
  const toast = useToast();

  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState(null);
  const [form, setForm] = useState({ userId: '', scheduledStart: '', scheduledEnd: '', note: '' });

  const canManage = isOwner || has('staff.manage');

  async function refresh() {
    const requests = [api.get(`/venues/${venueId}/shifts`)];
    if (canManage) requests.push(api.get(`/venues/${venueId}/staff`));
    const results = await Promise.all(requests);
    setShifts(results[0].data);
    if (canManage) setStaff(results[1].data);
  }

  useEffect(() => {
    if (venueId && !permsLoading) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, permsLoading]);

  async function createShift(e) {
    e.preventDefault();
    if (!form.userId || !form.scheduledStart || !form.scheduledEnd) {
      toast.error('کارمند و بازه زمانی شیفت را مشخص کنید.');
      return;
    }
    try {
      await api.post(`/venues/${venueId}/shifts`, form);
      setForm({ userId: '', scheduledStart: '', scheduledEnd: '', note: '' });
      toast.success('شیفت ثبت شد.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ثبت شیفت ناموفق بود.');
    }
  }

  async function removeShift(shift) {
    if (!(await confirm('این شیفت حذف شود؟', { danger: true }))) return;
    await api.delete(`/venues/${venueId}/shifts/${shift.id}`);
    refresh();
  }

  async function clockIn(shift) {
    try {
      await api.post(`/venues/${venueId}/shifts/${shift.id}/clock-in`);
      toast.success('ورود شما ثبت شد.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ثبت ورود ناموفق بود.');
    }
  }

  async function clockOut(shift) {
    try {
      await api.post(`/venues/${venueId}/shifts/${shift.id}/clock-out`);
      toast.success('خروج شما ثبت شد.');
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'ثبت خروج ناموفق بود.');
    }
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;
  if (permsLoading || !shifts) return <p className="text-gray-500">در حال بارگذاری شیفت‌ها...</p>;

  const myShifts = shifts.filter((s) => s.userId === user.id);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">ثبت شیفت جدید</h3>
          <form onSubmit={createShift} className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">انتخاب کارمند</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder="یادداشت (اختیاری)"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
              <input
                type="datetime-local"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={form.scheduledStart}
                onChange={(e) => setForm({ ...form, scheduledStart: e.target.value })}
              />
              <input
                type="datetime-local"
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={form.scheduledEnd}
                onChange={(e) => setForm({ ...form, scheduledEnd: e.target.value })}
              />
            </div>
            <Button type="submit">ثبت شیفت</Button>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">شیفت‌های من</h3>
        <div className="space-y-2">
          {myShifts.length === 0 && <p className="text-gray-500 text-sm">شیفتی برای شما ثبت نشده است.</p>}
          {myShifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm text-gray-800">
                  {new Date(shift.scheduledStart).toLocaleString('fa-IR')} تا {new Date(shift.scheduledEnd).toLocaleString('fa-IR')}
                </p>
                {shift.note && <p className="text-xs text-gray-500">{shift.note}</p>}
                <p className="text-xs text-gray-400">
                  {shift.clockInAt ? `ورود: ${new Date(shift.clockInAt).toLocaleTimeString('fa-IR')}` : 'ورود ثبت نشده'}
                  {shift.clockOutAt ? ` — خروج: ${new Date(shift.clockOutAt).toLocaleTimeString('fa-IR')}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {!shift.clockInAt && (
                  <Button onClick={() => clockIn(shift)}>ثبت ورود</Button>
                )}
                {shift.clockInAt && !shift.clockOutAt && (
                  <Button variant="secondary" onClick={() => clockOut(shift)}>
                    ثبت خروج
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {canManage && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">همه شیفت‌های مجموعه</h3>
          <div className="space-y-2">
            {shifts.length === 0 && <p className="text-gray-500 text-sm">شیفتی ثبت نشده است.</p>}
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{shift.userName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(shift.scheduledStart).toLocaleString('fa-IR')} تا {new Date(shift.scheduledEnd).toLocaleString('fa-IR')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {shift.clockInAt ? `ورود: ${new Date(shift.clockInAt).toLocaleTimeString('fa-IR')}` : 'ورود ثبت نشده'}
                    {shift.clockOutAt ? ` — خروج: ${new Date(shift.clockOutAt).toLocaleTimeString('fa-IR')}` : ''}
                  </p>
                </div>
                <Button variant="danger" onClick={() => removeShift(shift)}>
                  حذف
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
