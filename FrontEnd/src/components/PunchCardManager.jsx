import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from './Card';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

export default function PunchCardManager({ venueId }) {
  const { t, n } = useLanguage();
  const [plans, setPlans] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState({ name: '', menuItemId: '', totalCredits: '', price: '' });

  async function refresh() {
    const { data } = await api.get(`/venues/${venueId}/punch-cards`);
    setPlans(data);
  }

  useEffect(() => {
    if (!venueId) return;
    refresh();
    api.get(`/menu/${venueId}/items`).then(({ data }) => setMenuItems(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createPlan(e) {
    e.preventDefault();
    if (!form.name || !form.menuItemId || !form.totalCredits || !form.price) return;
    await api.post(`/venues/${venueId}/punch-cards`, {
      name: form.name,
      menuItemId: form.menuItemId,
      totalCredits: Number(form.totalCredits),
      price: Number(form.price),
    });
    setForm({ name: '', menuItemId: '', totalCredits: '', price: '' });
    refresh();
  }

  async function toggleActive(plan) {
    await api.patch(`/venues/${venueId}/punch-cards/${plan.id}`, { isActive: !plan.isActive });
    refresh();
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-800 mb-1">{t('components.punchCardManager.title')}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {t('components.punchCardManager.description')}
      </p>
      <form onSubmit={createPlan} className="grid sm:grid-cols-2 gap-2 mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 sm:col-span-2"
          placeholder={t('components.punchCardManager.namePlaceholder')}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 sm:col-span-2"
          value={form.menuItemId}
          onChange={(e) => setForm({ ...form, menuItemId: e.target.value })}
        >
          <option value="">{t('components.punchCardManager.selectMenuItem')}</option>
          {menuItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {n(Number(item.price))} {t('common.toman')}
            </option>
          ))}
        </select>
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-3 py-2"
          placeholder={t('components.punchCardManager.totalCreditsPlaceholder')}
          value={form.totalCredits}
          onChange={(e) => setForm({ ...form, totalCredits: e.target.value })}
        />
        <input
          type="number"
          className="border border-gray-300 rounded-lg px-3 py-2"
          placeholder={t('components.punchCardManager.pricePlaceholder')}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
        />
        <Button type="submit" className="sm:col-span-2">
          {t('components.punchCardManager.createPlan')}
        </Button>
      </form>

      <div className="grid sm:grid-cols-2 gap-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="font-bold text-primary-700">{plan.name}</p>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  plan.isActive ? 'bg-primary-800 text-white' : 'bg-gray-200 text-ink/50'
                }`}
              >
                {plan.isActive ? t('common.active') : t('common.inactive')}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {plan.menuItemName} — {n(plan.totalCredits)} {t('components.punchCardManager.unitsSuffix')} {t('components.punchCardManager.atPriceOf')} {n(Number(plan.price))} {t('common.toman')}
            </p>
            <Button variant="ghost" onClick={() => toggleActive(plan)} className="mt-2">
              {plan.isActive ? t('components.punchCardManager.deactivateAction') : t('components.punchCardManager.activateAction')}
            </Button>
          </Card>
        ))}
        {plans.length === 0 && <p className="text-sm text-gray-400">{t('components.punchCardManager.empty')}</p>}
      </div>
    </Card>
  );
}
