import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

export default function AccountDangerZone() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete('/customers/account');
      await logout();
      navigate('/');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <Card className="border-2 border-primary-800">
        <h3 className="font-bold text-ink mb-2">{t('dangerZone.title')}</h3>
        <p className="text-sm text-gray-500 mb-3">
          {t('dangerZone.desc')}
        </p>
        {!confirming ? (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            {t('dangerZone.title')}
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('dangerZone.deleting') : t('dangerZone.confirmDelete')}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t('account.cancel')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
