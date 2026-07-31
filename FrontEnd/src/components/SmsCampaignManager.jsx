import { useEffect, useState } from 'react';
import api from '../services/api';
import Card from './Card';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

function getStatusLabels(t) {
  return {
    PENDING: t('components.smsCampaignManager.statusPending'),
    APPROVED: t('components.smsCampaignManager.statusApproved'),
    REJECTED: t('components.smsCampaignManager.statusRejected'),
    SENT: t('components.smsCampaignManager.statusSent'),
    FAILED: t('components.smsCampaignManager.statusFailed'),
  };
}
const STATUS_COLOR = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  SENT: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

export default function SmsCampaignManager({ venueId }) {
  const { t, n } = useLanguage();
  const STATUS_LABEL = getStatusLabels(t);
  const [credit, setCredit] = useState(0);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', alsoSendEmail: false });
  const [topUpAmount, setTopUpAmount] = useState('');
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [msg, setMsg] = useState('');

  async function refresh() {
    const [{ data: creditData }, { data: campaignData }] = await Promise.all([
      api.get(`/venues/${venueId}/sms-campaigns/credit`),
      api.get(`/venues/${venueId}/sms-campaigns`),
    ]);
    setCredit(creditData.balance);
    setCampaigns(campaignData);
  }

  useEffect(() => {
    if (!venueId) return;
    refresh();
    api.get('/payments/methods').then(({ data }) => {
      setPaymentMethods(data);
      setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function createCampaign(e) {
    e.preventDefault();
    if (!form.title || !form.message) return;
    setMsg('');
    try {
      await api.post(`/venues/${venueId}/sms-campaigns`, form);
      setForm({ title: '', message: '', alsoSendEmail: false });
      setMsg(t('components.smsCampaignManager.campaignSubmitted'));
      refresh();
    } catch (err) {
      setMsg(err.response?.data?.message || t('components.smsCampaignManager.createError'));
    }
  }

  async function topUp() {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;
    try {
      const { data } = await api.post(`/venues/${venueId}/sms-campaigns/credit/topup`, {
        amount,
        provider: selectedProvider || undefined,
      });
      if (data.success) {
        setCredit(data.balance);
        setTopUpAmount('');
        setMsg(t('components.smsCampaignManager.creditToppedUp'));
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (err) {
      setMsg(err.response?.data?.message || t('components.smsCampaignManager.topUpError'));
    }
  }

  return (
    <Card>
      <h3 className="font-semibold text-gray-800 mb-1">{t('components.smsCampaignManager.title')}</h3>
      <p className="text-xs text-gray-500 mb-3">
        {t('components.smsCampaignManager.description')}
      </p>

      <div className="flex items-center justify-between bg-primary-50 rounded-lg px-4 py-3 mb-4">
        <span className="text-sm text-gray-700">{t('components.smsCampaignManager.currentCredit')}</span>
        <span className="font-bold text-primary-800">{n(Number(credit))} {t('common.toman')}</span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="number"
          min="1000"
          step="1000"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
          placeholder={t('components.smsCampaignManager.topUpPlaceholder')}
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={topUp} disabled={!topUpAmount}>
          {t('components.smsCampaignManager.topUpButton')}
        </Button>
      </div>
      {paymentMethods.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {paymentMethods.map((m) => (
            <button
              key={m.name}
              type="button"
              onClick={() => setSelectedProvider(m.name)}
              className={`px-3 py-1.5 rounded-lg text-xs border font-bold ${
                selectedProvider === m.name ? 'border-primary-800 bg-primary-800 text-white' : 'border-gray-300 bg-white text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={createCampaign} className="space-y-2 mb-4">
        <input
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
          placeholder={t('components.smsCampaignManager.titlePlaceholder')}
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full"
          rows={3}
          maxLength={500}
          placeholder={t('components.smsCampaignManager.messagePlaceholder')}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.alsoSendEmail}
            onChange={(e) => setForm({ ...form, alsoSendEmail: e.target.checked })}
          />
          {t('components.smsCampaignManager.alsoSendEmailLabel')}
        </label>
        <Button type="submit" className="w-full">
          {t('components.smsCampaignManager.submitCampaign')}
        </Button>
      </form>

      {msg && <p className="text-sm text-ink font-medium mb-3">{msg}</p>}

      <div className="space-y-2">
        {campaigns.length === 0 && <p className="text-sm text-gray-400">{t('components.smsCampaignManager.empty')}</p>}
        {campaigns.map((c) => (
          <Card key={c.id} className="bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="font-bold text-primary-700">{c.title}</p>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>{STATUS_LABEL[c.status]}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{c.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {t('components.smsCampaignManager.recipientsLabel')} {n(c.recipientCount)} — {t('components.smsCampaignManager.costLabel')} {n(Number(c.totalCost))} {t('common.toman')}
              {c.status === 'REJECTED' && c.rejectionReason && ` — ${t('components.smsCampaignManager.rejectionReasonLabel')} ${c.rejectionReason}`}
            </p>
          </Card>
        ))}
      </div>
    </Card>
  );
}
