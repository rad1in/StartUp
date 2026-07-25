import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

export default function SmsCampaigns() {
  const { t } = useLanguage();
  const STATUS_LABEL = {
    PENDING: t('admin.smsCampaigns.statusPending'),
    APPROVED: t('admin.smsCampaigns.statusApproved'),
    REJECTED: t('admin.smsCampaigns.statusRejected'),
    SENT: t('admin.smsCampaigns.statusSent'),
    FAILED: t('admin.smsCampaigns.statusFailed'),
  };
  const STATUS_COLOR = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-700',
    SENT: 'bg-green-100 text-green-700',
    FAILED: 'bg-red-100 text-red-700',
  };

  const [campaigns, setCampaigns] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [busyId, setBusyId] = useState(null);

  async function refresh() {
    const { data } = await api.get('/admin/sms-campaigns', { params: filter ? { status: filter } : {} });
    setCampaigns(data);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function approve(id) {
    setBusyId(id);
    try {
      await api.post(`/admin/sms-campaigns/${id}/approve`);
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id) {
    const reason = window.prompt(t('admin.smsCampaigns.rejectReasonPrompt')) || '';
    setBusyId(id);
    try {
      await api.post(`/admin/sms-campaigns/${id}/reject`, { reason });
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['PENDING', 'APPROVED', 'SENT', 'REJECTED', 'FAILED', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
              filter === s ? 'border-primary-800 bg-primary-800 text-white' : 'border-gray-300 bg-white text-gray-700'
            }`}
          >
            {s ? STATUS_LABEL[s] : t('admin.smsCampaigns.allWord')}
          </button>
        ))}
      </div>

      {campaigns.length === 0 && <p className="text-sm text-gray-400">{t('admin.smsCampaigns.noCampaignsFound')}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        {campaigns.map((c) => (
          <Card key={c.id}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-primary-700">{c.title}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('admin.smsCampaigns.venueLabel')}: {c.venueName}</p>
            <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{c.message}</p>
            <p className="text-xs text-gray-400 mt-2">
              {t('admin.smsCampaigns.recipientsLabel')}: {c.recipientCount.toLocaleString('fa-IR')} — {t('admin.smsCampaigns.costLabel')}: {Number(c.totalCost).toLocaleString('fa-IR')} {t('common.toman')}
            </p>
            {c.status === 'PENDING' && (
              <div className="flex gap-2 mt-3">
                <Button onClick={() => approve(c.id)} disabled={busyId === c.id}>
                  <span className="flex items-center gap-1"><Check size={14} />{t('admin.smsCampaigns.approveAndSend')}</span>
                </Button>
                <Button variant="danger" onClick={() => reject(c.id)} disabled={busyId === c.id}>
                  <span className="flex items-center gap-1"><X size={14} />{t('admin.smsCampaigns.reject')}</span>
                </Button>
              </div>
            )}
            {c.status === 'REJECTED' && c.rejectionReason && (
              <p className="text-xs text-red-600 mt-2">{t('admin.smsCampaigns.rejectionReasonLabel')}: {c.rejectionReason}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
