import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

const TYPE_LABELS = {
  SINGLE_SELECT: 'انتخاب تکی',
  MULTI_SELECT: 'انتخاب چندتایی',
  TOGGLE_REMOVE: 'حذف افزودنی',
};

export default function ModifierGroups() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const confirm = useConfirm();

  const [groups, setGroups] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const [newGroup, setNewGroup] = useState({ name: '', type: 'SINGLE_SELECT', isRequired: false, minSelections: 0, maxSelections: '' });

  async function refresh() {
    const [{ data: g }, { data: mi }] = await Promise.all([
      api.get(`/menu/${venueId}/modifier-groups`),
      api.get(`/menu/${venueId}/items/all`),
    ]);
    setGroups(g);
    setMenuItems(mi);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createGroup(e) {
    e.preventDefault();
    if (!newGroup.name.trim()) return;
    await api.post(`/menu/${venueId}/modifier-groups`, {
      ...newGroup,
      minSelections: Number(newGroup.minSelections),
      maxSelections: newGroup.maxSelections !== '' ? Number(newGroup.maxSelections) : null,
    });
    setNewGroup({ name: '', type: 'SINGLE_SELECT', isRequired: false, minSelections: 0, maxSelections: '' });
    refresh();
  }

  async function deleteGroup(groupId) {
    if (!(await confirm('این گروه و تمام گزینه‌هایش حذف می‌شوند. ادامه دهید؟', { danger: true }))) return;
    await api.delete(`/menu/${venueId}/modifier-groups/${groupId}`);
    refresh();
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">افزودن گروه سفارشی‌سازی</h3>
        <form onSubmit={createGroup} className="grid sm:grid-cols-2 gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="نام گروه (مثلاً اندازه)"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={newGroup.type}
            onChange={(e) => setNewGroup({ ...newGroup, type: e.target.value })}
          >
            {Object.entries(TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="حداقل"
              value={newGroup.minSelections}
              onChange={(e) => setNewGroup({ ...newGroup, minSelections: e.target.value })}
            />
            <input
              type="number"
              min={0}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2"
              placeholder="حداکثر (خالی = نامحدود)"
              value={newGroup.maxSelections}
              onChange={(e) => setNewGroup({ ...newGroup, maxSelections: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newGroup.isRequired}
              onChange={(e) => setNewGroup({ ...newGroup, isRequired: e.target.checked })}
            />
            الزامی
          </label>
          <Button type="submit" className="sm:col-span-2">افزودن گروه</Button>
        </form>
      </Card>

      <div className="space-y-3">
        {groups.map((group) => (
          <ModifierGroupCard
            key={group.id}
            group={group}
            venueId={venueId}
            menuItems={menuItems}
            expanded={expandedGroupId === group.id}
            onToggle={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
            onDelete={() => deleteGroup(group.id)}
            onRefresh={refresh}
          />
        ))}
      </div>
    </div>
  );
}

function ModifierGroupCard({ group, venueId, menuItems, expanded, onToggle, onDelete, onRefresh }) {
  const [newOption, setNewOption] = useState({ name: '', priceAdjustment: '', isDefault: false });
  const [attachedItemIds, setAttachedItemIds] = useState(null);

  async function loadAttachments() {
    const results = await Promise.all(
      menuItems.map((item) =>
        api.get(`/menu/${venueId}/items/${item.id}/modifiers`).then(({ data }) => ({
          itemId: item.id,
          attached: data.some((g) => g.id === group.id),
        }))
      )
    );
    setAttachedItemIds(new Set(results.filter((r) => r.attached).map((r) => r.itemId)));
  }

  useEffect(() => {
    if (expanded) loadAttachments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  async function addOption(e) {
    e.preventDefault();
    if (!newOption.name.trim()) return;
    await api.post(`/menu/${venueId}/modifier-groups/${group.id}/options`, {
      name: newOption.name,
      priceAdjustment: Number(newOption.priceAdjustment) || 0,
      isDefault: newOption.isDefault,
    });
    setNewOption({ name: '', priceAdjustment: '', isDefault: false });
    onRefresh();
  }

  async function deleteOption(optionId) {
    await api.delete(`/menu/${venueId}/modifier-groups/${group.id}/options/${optionId}`);
    onRefresh();
  }

  async function toggleItemAttachment(item) {
    const attached = attachedItemIds?.has(item.id);
    const { data: currentModifiers } = await api.get(`/menu/${venueId}/items/${item.id}/modifiers`);
    const currentGroupIds = currentModifiers.map((g) => g.id);
    const newGroupIds = attached
      ? currentGroupIds.filter((id) => id !== group.id)
      : [...currentGroupIds, group.id];
    await api.put(`/menu/${venueId}/items/${item.id}/modifiers`, { groupIds: newGroupIds });
    loadAttachments();
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-800">{group.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {TYPE_LABELS[group.type]}
            {group.isRequired ? ' — الزامی' : ''}
            {group.minSelections > 0 ? ` — حداقل ${group.minSelections}` : ''}
            {group.maxSelections !== null ? ` — حداکثر ${group.maxSelections}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onToggle}>
            {expanded ? 'بستن' : 'مدیریت'}
          </Button>
          <Button variant="danger" onClick={onDelete}>حذف</Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">گزینه‌ها</p>
            <ul className="space-y-1 mb-3">
              {(group.options || []).map((opt) => (
                <li key={opt.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                  <span>
                    {opt.name}
                    {Number(opt.priceAdjustment) !== 0 && (
                      <span className="text-primary-700 mr-2">+{Number(opt.priceAdjustment).toLocaleString('fa-IR')}</span>
                    )}
                    {!!opt.isDefault && <span className="text-xs text-gray-400 mr-2">(پیش‌فرض)</span>}
                  </span>
                  <button className="text-xs text-ink/50 hover:text-ink" onClick={() => deleteOption(opt.id)}>حذف</button>
                </li>
              ))}
            </ul>
            <form onSubmit={addOption} className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="نام گزینه"
                value={newOption.name}
                onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
              />
              <input
                type="number"
                className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                placeholder="افزایش قیمت"
                value={newOption.priceAdjustment}
                onChange={(e) => setNewOption({ ...newOption, priceAdjustment: e.target.value })}
              />
              <label className="flex items-center gap-1 text-xs text-gray-600">
                <input type="checkbox" checked={newOption.isDefault} onChange={(e) => setNewOption({ ...newOption, isDefault: e.target.checked })} />
                پیش‌فرض
              </label>
              <Button type="submit" variant="secondary">افزودن</Button>
            </form>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">اتصال به آیتم‌های منو</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {menuItems.map((item) => (
                <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={attachedItemIds?.has(item.id) || false}
                    onChange={() => toggleItemAttachment(item)}
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
