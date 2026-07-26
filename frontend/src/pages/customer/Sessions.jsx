import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import TwoFactorSettings from '../../components/TwoFactorSettings';
import { useLanguage } from '../../context/LanguageContext';

export default function Sessions() {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data } = await api.get('/customers/sessions');
    setSessions(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function revoke(id) {
    await api.delete(`/customers/sessions/${id}`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <TwoFactorSettings />

      <div>
        <h3 className="font-extrabold text-ink mb-3 flex items-center gap-2">
          <span className="section-tick" style={{ height: '1.1rem' }} />
          {t('sessions.activeSessions')}
        </h3>
        {loading && <p className="text-gray-500">{t('sessions.loading')}</p>}
        {!loading && sessions.length === 0 && <p className="text-gray-500">{t('sessions.none')}</p>}
        <div className="space-y-3 max-w-lg">
          {sessions.map((session) => (
        <Card key={session.id} className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-800 break-all">{session.userAgent || t('sessions.unknownDevice')}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t('sessions.lastUsed')} {session.lastUsedAt ? new Date(session.lastUsedAt).toLocaleString('fa-IR') : '—'}
            </p>
          </div>
          <Button variant="danger" onClick={() => revoke(session.id)}>
            {t('sessions.signOutDevice')}
          </Button>
        </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
