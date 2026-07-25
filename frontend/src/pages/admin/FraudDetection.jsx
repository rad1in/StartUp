import { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useToast } from '../../context/ToastContext';

const RULE_LABELS = {
  HIGH_VOID_RATE: 'نرخ ابطال بالا',
  ORDER_VOLUME_SPIKE: 'جهش حجم سفارش',
  FAILED_PAYMENT_SURGE: 'تلاش‌های پرداخت ناموفق',
  COUPON_ABUSE: 'سوء استفاده از کوپن',
};

const STATUS_LABELS = { OPEN: 'باز', REVIEWING: 'در بررسی', DISMISSED: 'رد شده', ACTIONED: 'اقدام شده' };
const STATUS_COLORS = {
  OPEN: 'bg-red-100 text-red-700',
  REVIEWING: 'bg-yellow-100 text-yellow-700',
  DISMISSED: 'bg-gray-100 text-gray-600',
  ACTIONED: 'bg-green-100 text-green-700',
};
const ENTITY_LABELS = { VENUE: 'مجموعه', CUSTOMER: 'مشتری', ORDER: 'سفارش' };

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
        <h3 className="font-semibold text-gray-800 mb-4">بررسی پرچم: {RULE_LABELS[flag.ruleKey] || flag.ruleKey}</h3>
        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm text-gray-700">{flag.reason}</div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">وضعیت جدید</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="REVIEWING">در بررسی</option>
              <option value="DISMISSED">رد شده (بی‌خطر)</option>
              <option value="ACTIONED">اقدام شده</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">یادداشت داخلی</label>
            <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیح اقدام انجام شده..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="ghost" onClick={onClose}>انصراف</Button>
            <Button type="submit" disabled={saving}>ذخیره</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

const THRESHOLD_LABELS = {
  voidRatePercent: 'نرخ ابطال مشکوک (٪)',
  voidRateMinOrders: 'حداقل تعداد سفارش برای بررسی نرخ ابطال',
  volumeSpikeMultiplier: 'ضریب جهش حجم سفارش',
  volumeSpikeMinAvgDaily: 'حداقل میانگین روزانه برای بررسی جهش',
  failedPaymentMax: 'حداکثر تلاش پرداخت ناموفق مجاز (۷ روز)',
  couponRedemptionsMax: 'حداکثر استفاده از کوپن مجاز (۳۰ روز)',
};

export default function FraudDetection() {
  const toast = useToast();
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
      toast.success('آستانه‌های تشخیص تقلب ذخیره شد.');
    } finally {
      setSavingThresholds(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      const { data } = await api.post('/admin/fraud/scan');
      toast.success(`اسکن کامل شد: ${data.flagsCreated} پرچم جدید، ${data.flagsUpdated} بروزرسانی، ${data.errors?.length || 0} خطا`);
      await load();
    } finally { setScanning(false); }
  }

  return (
    <div className="space-y-5">
      {reviewing && <ReviewModal flag={reviewing} onClose={() => setReviewing(null)} onDone={() => { setReviewing(null); load(); }} />}

      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card><p className="text-xs text-gray-500">کل پرچم‌ها</p><p className="text-xl font-bold text-gray-900">{Number(summary.total).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">باز</p><p className="text-xl font-bold text-red-600">{Number(summary.open).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">در بررسی</p><p className="text-xl font-bold text-yellow-600">{Number(summary.reviewing).toLocaleString('fa-IR')}</p></Card>
          <Card><p className="text-xs text-gray-500">ریسک بالا (≥۷۰)</p><p className="text-xl font-bold text-red-700">{Number(summary.highRisk).toLocaleString('fa-IR')}</p></Card>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
          <option value="">همه موجودیت‌ها</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button onClick={runScan} disabled={scanning} variant="danger">
          {scanning ? 'در حال اسکن...' : 'اجرای اسکن هوشمند'}
        </Button>
        <Button variant="ghost" onClick={() => setShowThresholds((s) => !s)}>
          {showThresholds ? 'بستن تنظیمات' : 'تنظیم آستانه‌ها'}
        </Button>
        <p className="text-xs text-gray-400 mr-auto">{total} مورد یافت شد</p>
      </div>

      {showThresholds && thresholds && (
        <Card>
          <h3 className="font-bold text-ink text-sm mb-3">آستانه‌های تشخیص تقلب</h3>
          <form onSubmit={saveThresholds} className="grid sm:grid-cols-2 gap-3">
            {Object.entries(THRESHOLD_LABELS).map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input
                  type="number"
                  step="0.1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={thresholds[key]}
                  onChange={(e) => setThresholds((t) => ({ ...t, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={savingThresholds}>
                {savingThresholds ? 'در حال ذخیره...' : 'ذخیره آستانه‌ها'}
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
                  <p className="text-xs text-gray-500 mt-1 italic">یادداشت: {flag.reviewNote}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{new Date(flag.createdAt).toLocaleString('fa-IR')}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">امتیاز ریسک</p>
                  <RiskBadge score={flag.riskScore} />
                </div>
                {flag.status !== 'DISMISSED' && flag.status !== 'ACTIONED' && (
                  <Button variant="secondary" onClick={() => setReviewing(flag)}>بررسی</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {flags.length === 0 && <p className="text-gray-500 text-sm text-center py-8">هیچ پرچمی یافت نشد.</p>}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex gap-2 justify-center">
          <Button variant="ghost" disabled={page === 1} onClick={() => setPage(page - 1)}>قبلی</Button>
          <span className="text-sm text-gray-600 self-center">صفحه {page} از {Math.ceil(total / 20)}</span>
          <Button variant="ghost" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(page + 1)}>بعدی</Button>
        </div>
      )}

      {/* Architecture note */}
      <Card className="bg-blue-50 border-blue-100">
        <p className="text-xs text-blue-700 font-medium">معماری قابل توسعه</p>
        <p className="text-xs text-blue-600 mt-1">
          موتور تشخیص فعلی مبتنی بر قوانین است (HIGH_VOID_RATE، ORDER_VOLUME_SPIKE، FAILED_PAYMENT_SURGE، COUPON_ABUSE).
          برای اتصال مدل ML، کافی است یک تابع rule جدید به <code className="bg-blue-100 px-1 rounded">fraud/rules.js</code> اضافه شود.
        </p>
      </Card>
    </div>
  );
}
