import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useConfirm } from '../../context/ConfirmContext';

const CRITERIA_LABELS = {
  TOTAL_ORDERS: 'تعداد کل سفارش',
  ORDERS_AT_VENUE: 'سفارش در یک کافه',
  DISTINCT_VENUES: 'کافه‌های مختلف',
  FIRST_ORDER_OF_MONTH: 'اولین سفارش ماه',
  TOTAL_SPEND: 'مجموع خرید (تومان)',
};

const emptyTier = { name: '', icon: '', minSpend: 0, minOrders: 0, pointsMultiplier: 1.0, sortOrder: 0 };
const emptyBadge = { name: '', icon: '', description: '', criteriaType: 'TOTAL_ORDERS', threshold: 1, isActive: true };

export default function Gamification() {
  const confirm = useConfirm();
  const [tiers, setTiers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [tierForm, setTierForm] = useState(emptyTier);
  const [badgeForm, setBadgeForm] = useState(emptyBadge);
  const [editingTierId, setEditingTierId] = useState(null);
  const [editingBadgeId, setEditingBadgeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function refresh() {
    const [{ data: t }, { data: b }] = await Promise.all([
      api.get('/gamification/tiers'),
      api.get('/gamification/badges'),
    ]);
    setTiers(t);
    setBadges(b);
  }

  useEffect(() => { refresh(); }, []);

  function flash(text, type = 'success') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  }

  async function saveTier(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTierId) {
        await api.patch(`/gamification/tiers/${editingTierId}`, tierForm);
      } else {
        await api.post('/gamification/tiers', tierForm);
      }
      setTierForm(emptyTier);
      setEditingTierId(null);
      await refresh();
      flash('سطح ذخیره شد.');
    } catch (err) {
      flash(err.response?.data?.message || 'خطا', 'error');
    } finally { setSaving(false); }
  }

  async function deleteTier(id) {
    if (!(await confirm('حذف شود؟', { danger: true }))) return;
    await api.delete(`/gamification/tiers/${id}`);
    await refresh();
  }

  function editTier(tier) {
    setEditingTierId(tier.id);
    setTierForm({ name: tier.name, icon: tier.icon, minSpend: tier.minSpend, minOrders: tier.minOrders, pointsMultiplier: tier.pointsMultiplier, sortOrder: tier.sortOrder });
  }

  async function saveBadge(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingBadgeId) {
        await api.patch(`/gamification/badges/${editingBadgeId}`, badgeForm);
      } else {
        await api.post('/gamification/badges', badgeForm);
      }
      setBadgeForm(emptyBadge);
      setEditingBadgeId(null);
      await refresh();
      flash('نشان ذخیره شد.');
    } catch (err) {
      flash(err.response?.data?.message || 'خطا', 'error');
    } finally { setSaving(false); }
  }

  async function deleteBadge(id) {
    if (!(await confirm('حذف شود؟', { danger: true }))) return;
    await api.delete(`/gamification/badges/${id}`);
    await refresh();
  }

  function editBadge(badge) {
    setEditingBadgeId(badge.id);
    setBadgeForm({ name: badge.name, icon: badge.icon, description: badge.description, criteriaType: badge.criteriaType, threshold: badge.threshold, isActive: badge.isActive });
  }

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-gray-800">تنظیمات گیمیفیکیشن</h1>

      {msg && (
        <p className={`text-sm ${msg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</p>
      )}

      {/* Tiers */}
      <Card>
        <h2 className="text-base font-semibold text-gray-800 mb-4">سطوح وفاداری</h2>
        <form onSubmit={saveTier} className="grid sm:grid-cols-3 gap-3 mb-4">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="نام سطح" value={tierForm.name} onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="آیکون (ایموجی)" value={tierForm.icon} onChange={(e) => setTierForm({ ...tierForm, icon: e.target.value })} />
          <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="حداقل خرید (تومان)" value={tierForm.minSpend} onChange={(e) => setTierForm({ ...tierForm, minSpend: Number(e.target.value) })} />
          <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="حداقل تعداد سفارش" value={tierForm.minOrders} onChange={(e) => setTierForm({ ...tierForm, minOrders: Number(e.target.value) })} />
          <input type="number" step="0.01" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ضریب امتیاز (مثلاً ۱.۵)" value={tierForm.pointsMultiplier} onChange={(e) => setTierForm({ ...tierForm, pointsMultiplier: Number(e.target.value) })} />
          <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="ترتیب نمایش" value={tierForm.sortOrder} onChange={(e) => setTierForm({ ...tierForm, sortOrder: Number(e.target.value) })} />
          <div className="sm:col-span-3 flex gap-2">
            <Button type="submit" disabled={saving}>{editingTierId ? 'بروزرسانی' : 'افزودن سطح'}</Button>
            {editingTierId && <Button type="button" variant="ghost" onClick={() => { setEditingTierId(null); setTierForm(emptyTier); }}>انصراف</Button>}
          </div>
        </form>
        <div className="divide-y">
          {tiers.map((tier) => (
            <div key={tier.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{tier.icon} {tier.name}</p>
                <p className="text-xs text-gray-500">
                  حداقل خرید: {Number(tier.minSpend).toLocaleString('fa-IR')} — حداقل سفارش: {tier.minOrders} — ضریب امتیاز: {tier.pointsMultiplier} برابر
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => editTier(tier)}>ویرایش</Button>
                <Button variant="danger" onClick={() => deleteTier(tier.id)}>حذف</Button>
              </div>
            </div>
          ))}
          {tiers.length === 0 && <p className="text-sm text-gray-500 py-3">هنوز سطحی تعریف نشده است.</p>}
        </div>
      </Card>

      {/* Badges */}
      <Card>
        <h2 className="text-base font-semibold text-gray-800 mb-4">نشان‌های موفقیت</h2>
        <form onSubmit={saveBadge} className="grid sm:grid-cols-3 gap-3 mb-4">
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="نام نشان" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} required />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="آیکون (ایموجی)" value={badgeForm.icon} onChange={(e) => setBadgeForm({ ...badgeForm, icon: e.target.value })} />
          <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm sm:col-span-3" placeholder="توضیحات" value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} required />
          <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={badgeForm.criteriaType} onChange={(e) => setBadgeForm({ ...badgeForm, criteriaType: e.target.value })}>
            {Object.entries(CRITERIA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="آستانه" value={badgeForm.threshold} onChange={(e) => setBadgeForm({ ...badgeForm, threshold: Number(e.target.value) })} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={badgeForm.isActive} onChange={(e) => setBadgeForm({ ...badgeForm, isActive: e.target.checked })} />
            فعال
          </label>
          <div className="sm:col-span-3 flex gap-2">
            <Button type="submit" disabled={saving}>{editingBadgeId ? 'بروزرسانی' : 'افزودن نشان'}</Button>
            {editingBadgeId && <Button type="button" variant="ghost" onClick={() => { setEditingBadgeId(null); setBadgeForm(emptyBadge); }}>انصراف</Button>}
          </div>
        </form>
        <div className="divide-y">
          {badges.map((badge) => (
            <div key={badge.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{badge.icon} {badge.name}</p>
                <p className="text-xs text-gray-500">
                  {CRITERIA_LABELS[badge.criteriaType]} ≥ {Number(badge.threshold).toLocaleString('fa-IR')} — {badge.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => editBadge(badge)}>ویرایش</Button>
                <Button variant="danger" onClick={() => deleteBadge(badge.id)}>حذف</Button>
              </div>
            </div>
          ))}
          {badges.length === 0 && <p className="text-sm text-gray-500 py-3">هنوز نشانی تعریف نشده است.</p>}
        </div>
      </Card>
    </div>
  );
}
