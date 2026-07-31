import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function PairingRules() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const venueId = user?.venueId;

  const [rules, setRules] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [form, setForm] = useState({ triggerMenuItemId: '', suggestedMenuItemId: '', priority: 0 });

  async function refresh() {
    const [{ data: r }, { data: mi }] = await Promise.all([
      api.get(`/menu/${venueId}/pairings`),
      api.get(`/menu/${venueId}/items/all`),
    ]);
    setRules(r);
    setMenuItems(mi);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createRule(e) {
    e.preventDefault();
    if (!form.triggerMenuItemId || !form.suggestedMenuItemId) return;
    await api.post(`/menu/${venueId}/pairings`, { ...form, priority: Number(form.priority) });
    setForm({ triggerMenuItemId: '', suggestedMenuItemId: '', priority: 0 });
    refresh();
  }

  async function deleteRule(ruleId) {
    await api.delete(`/menu/${venueId}/pairings/${ruleId}`);
    refresh();
  }

  const itemName = (id) => menuItems.find((i) => i.id === id)?.name || id;

  if (!venueId) return <p className="text-gray-500">{t('common.noVenueLinked')}</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.pairingRules.addRuleTitle')}</h3>
        <form onSubmit={createRule} className="grid sm:grid-cols-3 gap-2">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.triggerMenuItemId}
            onChange={(e) => setForm({ ...form, triggerMenuItemId: e.target.value })}
          >
            <option value="">{t('venue.pairingRules.triggerItem')}</option>
            {menuItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.suggestedMenuItemId}
            onChange={(e) => setForm({ ...form, suggestedMenuItemId: e.target.value })}
          >
            <option value="">{t('venue.pairingRules.suggestedItem')}</option>
            {menuItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={t('venue.pairingRules.priority')}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
            <Button type="submit">{t('common.add')}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {rules.length === 0 && <p className="text-gray-500 text-sm">{t('venue.pairingRules.noRulesYet')}</p>}
        {rules.map((rule) => (
          <Card key={rule.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                <span className="font-medium">{itemName(rule.triggerMenuItemId)}</span>
                <ArrowLeft size={14} className="text-gray-400 mx-2 rotate-180" />
                <span className="font-medium">{itemName(rule.suggestedMenuItemId)}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{t('venue.pairingRules.priorityLabel')} {rule.priority}</p>
            </div>
            <Button variant="danger" onClick={() => deleteRule(rule.id)}>{t('common.delete')}</Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
