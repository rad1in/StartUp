import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function AuditLog() {
  const { t } = useLanguage();
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ action: '', entityType: '', from: '', to: '' });

  async function refresh(overrides = {}) {
    const merged = { ...filters, ...overrides };
    const params = {};
    Object.entries(merged).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    const { data } = await api.get('/admin/activity-log', { params });
    setEntries(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid sm:grid-cols-4 gap-3">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder={t('admin.auditLog.actionTypePlaceholder')}
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder={t('admin.auditLog.entityTypePlaceholder')}
            value={filters.entityType}
            onChange={(e) => setFilters((f) => ({ ...f, entityType: e.target.value }))}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          />
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Button onClick={refresh}>{t('admin.auditLog.applyFilter')}</Button>
          <Button
            variant="ghost"
            onClick={() => {
              setFilters((f) => ({ ...f, action: 'IMPERSONATED_ACTION' }));
              refresh({ action: 'IMPERSONATED_ACTION' });
            }}
          >
            {t('admin.auditLog.impersonationOnly')}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="text-sm border-b border-gray-100 pb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{entry.action}</span>
                <span className="text-xs text-gray-400">{new Date(entry.createdAt).toLocaleString('fa-IR')}</span>
              </div>
              <p className="text-xs text-gray-500">
                {t('admin.auditLog.actorLabel')}: {entry.userName || t('admin.auditLog.systemActor')} — {t('admin.auditLog.entityLabel')}: {entry.entityType} {entry.entityId ? `(${entry.entityId})` : ''}
              </p>
              {entry.details && (
                <p className="text-xs text-gray-400 break-all">{typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)}</p>
              )}
            </div>
          ))}
          {entries.length === 0 && <p className="text-gray-500 text-sm">{t('admin.auditLog.noEvents')}</p>}
        </div>
      </Card>
    </div>
  );
}
