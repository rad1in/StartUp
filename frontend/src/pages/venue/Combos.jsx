import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Combos() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [combos, setCombos] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', price: '', selectedItemIds: [] });

  async function refresh() {
    const [{ data: comboList }, { data: menuItems }] = await Promise.all([
      api.get(`/menu/${venueId}/combos/all`),
      api.get(`/menu/${venueId}/items/all`),
    ]);
    setCombos(comboList);
    setItems(menuItems);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  function toggleItem(itemId) {
    setForm((prev) => ({
      ...prev,
      selectedItemIds: prev.selectedItemIds.includes(itemId)
        ? prev.selectedItemIds.filter((id) => id !== itemId)
        : [...prev.selectedItemIds, itemId],
    }));
  }

  async function createCombo(e) {
    e.preventDefault();
    if (!form.name || !form.price || form.selectedItemIds.length === 0) return;
    await api.post(`/menu/${venueId}/combos`, {
      name: form.name,
      description: form.description,
      price: Number(form.price),
      items: form.selectedItemIds.map((menuItemId) => ({ menuItemId, quantity: 1 })),
    });
    setForm({ name: '', description: '', price: '', selectedItemIds: [] });
    refresh();
  }

  async function toggleActive(combo) {
    await api.patch(`/menu/${venueId}/combos/${combo.id}`, { isActive: !combo.isActive });
    refresh();
  }

  async function removeCombo(combo) {
    await api.delete(`/menu/${venueId}/combos/${combo.id}`);
    refresh();
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">ساخت کمبوی جدید</h3>
        <form onSubmit={createCombo} className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <input
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="نام کمبو"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              type="number"
              className="border border-gray-300 rounded-lg px-3 py-2"
              placeholder="قیمت کمبو (تومان)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </div>
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder="توضیحات"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div>
            <p className="text-sm text-gray-600 mb-2">آیتم‌های داخل کمبو را انتخاب کنید:</p>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={`text-xs px-2 py-1 rounded-full cursor-pointer border ${
                    form.selectedItemIds.includes(item.id)
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={form.selectedItemIds.includes(item.id)}
                    onChange={() => toggleItem(item.id)}
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit">ساخت کمبو</Button>
        </form>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {combos.map((combo) => (
          <Card key={combo.id}>
            <p className="font-medium text-gray-800">{combo.name}</p>
            <p className="text-sm text-gray-500 mt-1">{combo.description}</p>
            <p className="text-sm font-bold text-primary-700 mt-2">{Number(combo.price).toLocaleString('fa-IR')} تومان</p>
            <ul className="text-xs text-gray-500 mt-2">
              {combo.items.map((item) => (
                <li key={item.id}>
                  {item.menuItemName} — {item.quantity} عدد
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" onClick={() => toggleActive(combo)}>
                {combo.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
              </Button>
              <Button variant="danger" onClick={() => removeCombo(combo)}>
                حذف
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
