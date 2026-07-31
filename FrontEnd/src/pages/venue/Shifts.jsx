import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenuePermissions } from '../../hooks/useVenuePermissions';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Shifts() {
  const { t, date, timeShort } = useLanguage();
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
      toast.error(t('venue.shifts.specifyStaffAndTimeRange'));
      return;
    }
    try {
      await api.post(`/venues/${venueId}/shifts`, form);
      setForm({ userId: '', scheduledStart: '', scheduledEnd: '', note: '' });
      toast.success(t('venue.shifts.shiftRecorded'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('venue.shifts.shiftRecordFailed'));
    }
  }

  async function removeShift(shift) {
    if (!(await confirm(t('venue.shifts.confirmDeleteShift'), { danger: true }))) return;
    await api.delete(`/venues/${venueId}/shifts/${shift.id}`);
    refresh();
  }

  async function clockIn(shift) {
    try {
      await api.post(`/venues/${venueId}/shifts/${shift.id}/clock-in`);
      toast.success(t('venue.shifts.clockInRecorded'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('venue.shifts.clockInFailed'));
    }
  }

  async function clockOut(shift) {
    try {
      await api.post(`/venues/${venueId}/shifts/${shift.id}/clock-out`);
      toast.success(t('venue.shifts.clockOutRecorded'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('venue.shifts.clockOutFailed'));
    }
  }

  if (!venueId) return <p className="text-gray-500">{t('common.noVenueLinked')}</p>;
  if (permsLoading || !shifts) return <p className="text-gray-500">{t('venue.shifts.loadingShifts')}</p>;

  const myShifts = shifts.filter((s) => s.userId === user.id);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('venue.shifts.recordNewShift')}</h3>
          <form onSubmit={createShift} className="space-y-2">
            <div className="grid sm:grid-cols-2 gap-2">
              <select
                className="border border-gray-300 rounded-lg px-3 py-2"
                value={form.userId}
                onChange={(e) => setForm({ ...form, userId: e.target.value })}
              >
                <option value="">{t('venue.shifts.selectStaffMember')}</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2"
                placeholder={t('venue.inventory.notePlaceholder')}
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
            <Button type="submit">{t('venue.shifts.recordShift')}</Button>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.shifts.myShifts')}</h3>
        <div className="space-y-2">
          {myShifts.length === 0 && <p className="text-gray-500 text-sm">{t('venue.shifts.noShiftsForYou')}</p>}
          {myShifts.map((shift) => (
            <div key={shift.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <p className="text-sm text-gray-800">
                  {date(shift.scheduledStart)} {t('venue.accounting.dateRangeTo')} {date(shift.scheduledEnd)}
                </p>
                {shift.note && <p className="text-xs text-gray-500">{shift.note}</p>}
                <p className="text-xs text-gray-400">
                  {shift.clockInAt ? `${t('venue.shifts.clockInLabel')}: ${timeShort(shift.clockInAt)}` : t('venue.shifts.clockInNotRecorded')}
                  {shift.clockOutAt ? ` — ${t('venue.shifts.clockOutLabel')}: ${timeShort(shift.clockOutAt)}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {!shift.clockInAt && (
                  <Button onClick={() => clockIn(shift)}>{t('venue.shifts.clockIn')}</Button>
                )}
                {shift.clockInAt && !shift.clockOutAt && (
                  <Button variant="secondary" onClick={() => clockOut(shift)}>
                    {t('venue.shifts.clockOut')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {canManage && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('venue.shifts.allVenueShifts')}</h3>
          <div className="space-y-2">
            {shifts.length === 0 && <p className="text-gray-500 text-sm">{t('venue.shifts.noShiftsRecorded')}</p>}
            {shifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{shift.userName}</p>
                  <p className="text-xs text-gray-500">
                    {date(shift.scheduledStart)} {t('venue.accounting.dateRangeTo')} {date(shift.scheduledEnd)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {shift.clockInAt ? `${t('venue.shifts.clockInLabel')}: ${timeShort(shift.clockInAt)}` : t('venue.shifts.clockInNotRecorded')}
                    {shift.clockOutAt ? ` — ${t('venue.shifts.clockOutLabel')}: ${timeShort(shift.clockOutAt)}` : ''}
                  </p>
                </div>
                <Button variant="danger" onClick={() => removeShift(shift)}>
                  {t('common.delete')}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
