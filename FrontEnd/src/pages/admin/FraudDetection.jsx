import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';

function RiskBadge({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-sm font-medium">{score}</span>
    </div>
  );
}

function ReviewModal({ flag, onClose, onDone }) {
  const { t } = useLanguage();
  const RULE_LABELS = {
    HIGH_VOID_RATE: t('admin.fraudDetection.ruleHighVoidRate'),
    ORDER_VOLUME_SPIKE: t('admin.fraudDetection.ruleOrderVolumeSpike'),
    FAILED_PAYMENT_SURGE: t('admin.fraudDetection.ruleFailedPaymentSurge'),
    COUPON_ABUSE: t('admin.fraudDetection.ruleCouponAbuse'),
  };
  const [status, setStatus] = useState('REVIEWING');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.patch(`/admin/fraud/${flag.id}/review`, { status, reviewNote: note });
      onDone();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-800 mb-4">{t('admin.fraudDetection.reviewFlagPrefix')}: {RULE_LABELS[flag.ruleKey] || flag.ruleKey}</h3>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700">{flag.reason}</div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('admin.fraudDetection.newStatusLabel')}</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="REVIEWING">{t('admin.fraudDetection.statusReviewing')}</option>
              <option value="DISMISSED">{t('admin.fraudDetection.statusDismissedSafe')}</option>
              <option value="ACTIONED">{t('admin.fraudDetection.statusActioned')}</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">{t('admin.fraudDetection.internalNoteLabel')}</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('admin.fraudDetection.actionTakenPlaceholder')} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button type="submit" disabled={saving}>{t('common.save')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function FraudDetection() {
  const { t, n, date } = useLanguage();
  const toast = useToast();

  const RULE_LABELS = {
    HIGH_VOID_RATE: t('admin.fraudDetection.ruleHighVoidRate'),
    ORDER_VOLUME_SPIKE: t('admin.fraudDetection.ruleOrderVolumeSpike'),
    FAILED_PAYMENT_SURGE: t('admin.fraudDetection.ruleFailedPaymentSurge'),
    COUPON_ABUSE: t('admin.fraudDetection.ruleCouponAbuse'),
  };
  const STATUS_LABELS = {
    OPEN: t('admin.fraudDetection.statusOpen'),
    REVIEWING: t('admin.fraudDetection.statusReviewing'),
    DISMISSED: t('admin.fraudDetection.statusDismissed'),
    ACTIONED: t('admin.fraudDetection.statusActioned'),
  };
  const STATUS_COLORS = {
    OPEN: 'bg-red-100 text-red-700',
    REVIEWING: 'bg-yellow-100 text-yellow-700',
    DISMISSED: 'bg-gray-100 text-gray-600',
    ACTIONED: 'bg-green-100 text-green-700',
  };
  const ENTITY_LABELS = {
    VENUE: t('admin.fraudDetection.entityVenue'),
    CUSTOMER: t('admin.fraudDetection.entityCustomer'),
    ORDER: t('admin.fraudDetection.entityOrder'),
  };
  const THRESHOLD_LABELS = {
    voidRatePercent: t('admin.fraudDetection.thresholdVoidRatePercent'),
    voidRateMinOrders: t('admin.fraudDetection.thresholdVoidRateMinOrders'),
    volumeSpikeMultiplier: t('admin.fraudDetection.thresholdVolumeSpikeMultiplier'),
    volumeSpikeMinAvgDaily: t('admin.fraudDetection.thresholdVolumeSpikeMinAvgDaily'),
    failedPaymentMax: t('admin.fraudDetection.thresholdFailedPaymentMax'),
    couponRedemptionsMax: t('admin.fraudDetection.thresholdCouponRedemptionsMax'),
  };

  const [flags, setFlags] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [entityType, setEntityType] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [thresholds, setThresholds] = useState(null);
  const [showThresholds, setShowThresholds] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);

  const load = useCallback(async () => {
    const [{ data: f }, { data: s }] = await Promise.all([
      api.get('/admin/fraud', { params: { status, entityType, page, limit: 20 } }),
      api.get('/admin/fraud/summary'),
    ]);
    setFlags(f.flags); setTotal(f.total); setSummary(s);
  }, [status, entityType, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/admin/fraud/thresholds').then(({ data }) => setThresholds(data));
  }, []);

  async function saveThresholds(e) {
    e.preventDefault();
    setSavingThresholds(true);
    try {
      const { data } = await api.patch('/admin/fraud/thresholds', thresholds);
      setThresholds(data);
      toast.success(t('admin.fraudDetection.thresholdsSaved'));
    } finally {
      setSavingThresholds(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      const { data } = await api.post('/admin/fraud/scan');
      toast.success(`${t('admin.fraudDetection.scanCompletePrefix')}: ${data.flagsCreated} ${t('admin.fraudDetection.newFlags')}، ${data.flagsUpdated} ${t('admin.fraudDetection.updated')}، ${data.errors?.length || 0} ${t('admin.fraudDetection.errors')}`);
      await load();
    } finally { setScanning(false); }
  }

  return (
    <div className="space-y-5">
      {reviewing && <ReviewModal flag={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />}

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><p className="text-xs text-gray-500">{t('admin.fraudDetection.totalFlags')}</p><p className="text-xl font-bold text-gray-900">{n(Number(summary.total))}</p></Card>
          <Card><p className="text-xs text-gray-500">{t('admin.fraudDetection.statusOpen')}</p><p className="text-xl font-bold text-red-600">{n(Number(summary.open))}</p></Card>
          <Card><p className="text-xs text-gray-500">{t('admin.fraudDetection.statusReviewing')}</p><p className="text-xl font-bold text-yellow-600">{n(Number(summary.reviewing))}</p></Card>
          <Card><p className="text-xs text-gray-500">{t('admin.fraudDetection.highRisk')}</p><p className="text-xl font-bold text-red-700">{n(Number(summary.highRisk))}</p></Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">{t('admin.fraudDetection.allStatuses')}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">{t('admin.fraudDetection.allEntities')}</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button onClick={runScan} disabled={scanning} variant="danger">
          {scanning ? t('admin.fraudDetection.scanning') : t('admin.fraudDetection.runSmartScan')}
        </Button>
        <Button variant="ghost" onClick={() => setShowThresholds((s) => !s)}>
          {showThresholds ? t('admin.fraudDetection.closeSettings') : t('admin.fraudDetection.configureThresholds')}
        </Button>
        <p className="text-xs text-gray-400 mr-auto">{total} {t('admin.fraudDetection.itemsFound')}</p>
      </div>

      {showThresholds && thresholds && (
        <Card>
          <h3 className="font-bold text-ink text-sm mb-3">{t('admin.fraudDetection.thresholdsTitle')}</h3>
          <form onSubmit={saveThresholds} className="grid sm:grid-cols-2 gap-3">
            {Object.entries(THRESHOLD_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={thresholds[key]}
                  onChange={(e) => setThresholds((th) => ({ ...th, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingThresholds}>
                {savingThresholds ? t('admin.fraudDetection.saving') : t('admin.fraudDetection.saveThresholds')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Flags list */}
      <div className="space-y-2">
        {flags.map((flag) => (
          <Card key={flag.id}>
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[flag.status]}`}>
                    {STATUS_LABELS[flag.status]}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {RULE_LABELS[flag.ruleKey] || flag.ruleKey}
                  </span>
                  <span className="text-xs text-gray-400">{ENTITY_LABELS[flag.entityType]}: {flag.entityName || flag.entityId}</span>
                </div>
                <p className="text-sm text-gray-700">{flag.reason}</p>
                {flag.reviewNote && (
                  <p className="text-xs text-gray-500 mt-1 italic">{t('admin.fraudDetection.notePrefix')}: {flag.reviewNote}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{date(flag.createdAt)}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">{t('admin.fraudDetection.riskScore')}</p>
                  <RiskBadge score={flag.riskScore} />
                </div>
                {flag.status !== 'DISMISSED' && flag.status !== 'ACTIONED' && (
                  <Button variant="secondary" onClick={() => setReviewing(flag)}>{t('admin.fraudDetection.review')}</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {flags.length === 0 && <p className="text-gray-500 text-sm text-center py-8">{t('admin.fraudDetection.noFlagsFound')}</p>}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>{t('admin.fraudDetection.previous')}</Button>
          <span className="text-sm text-gray-600 self-center">{t('admin.fraudDetection.pagePrefix')} {page} {t('admin.fraudDetection.pageOf')} {Math.ceil(total / 20)}</span>
          <Button variant="ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>{t('admin.fraudDetection.next')}</Button>
        </div>
      )}

      {/* Architecture note */}
      <Card className="bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-700 font-medium">{t('admin.fraudDetection.extensibleArchTitle')}</p>
        <p className="text-xs text-blue-600 mt-1">
          {t('admin.fraudDetection.extensibleArchDescription')} (HIGH_VOID_RATE، ORDER_VOLUME_SPIKE، FAILED_PAYMENT_SURGE، COUPON_ABUSE).
          {t('admin.fraudDetection.extensibleArchMlNote')} <code className="bg-blue-100 px-1 rounded">fraud/rules.js</code> {t('admin.fraudDetection.extensibleArchAdded')}
        </p>
      </Card>
    </div>
  );
}
