import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Accounting() {
  const { user } = useAuth();
  const venueId = user?.venueId;
  const toast = useToast();
  const [period, setPeriod] = useState('daily');
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [newExpense, setNewExpense] = useState({ category: '', amount: '', note: '' });
  const [reportSchedule, setReportSchedule] = useState(null);
  const [reports, setReports] = useState([]);
  const [generating, setGenerating] = useState(false);

  async function refresh() {
    const [{ data: s }, { data: cat }, { data: exp }, { data: payoutList }, { data: sched }, { data: reportList }] = await Promise.all([
      api.get(`/accounting/${venueId}/summary`, { params: { period } }),
      api.get(`/accounting/${venueId}/revenue-by-category`),
      api.get(`/accounting/${venueId}/expenses`),
      api.get(`/accounting/${venueId}/payouts`),
      api.get(`/venues/${venueId}/financial-reports/schedule`),
      api.get(`/venues/${venueId}/financial-reports`),
    ]);
    setSummary(s);
    setByCategory(cat);
    setExpenses(exp);
    setPayouts(payoutList);
    setReportSchedule(sched);
    setReports(reportList);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, period]);

  async function updateReportSchedule(patch) {
    const { data } = await api.patch(`/venues/${venueId}/financial-reports/schedule`, { ...reportSchedule, ...patch });
    setReportSchedule(data);
  }

  async function generateReportNow() {
    setGenerating(true);
    try {
      await api.post(`/venues/${venueId}/financial-reports/generate`);
      toast.success('گزارش مالی جدید ساخته شد.');
      const { data: reportList } = await api.get(`/venues/${venueId}/financial-reports`);
      setReports(reportList);
    } catch (err) {
      toast.error(err.response?.data?.message || 'ساخت گزارش ناموفق بود.');
    } finally {
      setGenerating(false);
    }
  }

  async function addExpense(e) {
    e.preventDefault();
    if (!newExpense.category || !newExpense.amount) return;
    await api.post(`/accounting/${venueId}/expenses`, { ...newExpense, amount: Number(newExpense.amount) });
    setNewExpense({ category: '', amount: '', note: '' });
    refresh();
  }

  async function exportSummary(format) {
    const { data } = await api.get(`/accounting/${venueId}/summary`, {
      params: { period, format },
      responseType: 'blob',
    });
    const mime =
      format === 'csv'
        ? 'text/csv'
        : format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
    const url = window.URL.createObjectURL(new Blob([data], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-summary.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {['daily', 'weekly', 'monthly'].map((p) => (
            <Button key={p} variant={period === p ? 'primary' : 'secondary'} onClick={() => setPeriod(p)}>
              {p === 'daily' ? 'روزانه' : p === 'weekly' ? 'هفتگی' : 'ماهانه'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => exportSummary('csv')}>
            خروجی CSV
          </Button>
          <Button variant="ghost" onClick={() => exportSummary('xlsx')}>
            خروجی Excel
          </Button>
          <Button variant="ghost" onClick={() => exportSummary('pdf')}>
            خروجی PDF
          </Button>
        </div>
      </div>

      {summary && (
        <div className="grid sm:grid-cols-4 gap-3">
          <Card>
            <p className="text-xs text-gray-500">تعداد سفارش</p>
            <p className="text-xl font-bold text-gray-800">{summary.orderCount}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">فروش کل</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalRevenue.toLocaleString('fa-IR')}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">کارمزد پلتفرم</p>
            <p className="text-xl font-bold text-gray-800">{summary.totalCommission.toLocaleString('fa-IR')}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">درآمد خالص</p>
            <p className="text-xl font-bold text-primary-700">{summary.netRevenue.toLocaleString('fa-IR')}</p>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-1">گزارش خودکار دوره‌ای مالی</h3>
        <p className="text-xs text-gray-500 mb-3">
          با فعال‌سازی، به‌صورت خودکار در بازه انتخابی یک گزارش مالی جدید ساخته می‌شود و اعلانی برای شما ارسال می‌گردد.
        </p>
        {reportSchedule && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!reportSchedule.isActive}
                onChange={(e) => updateReportSchedule({ isActive: e.target.checked })}
              />
              فعال
            </label>
            <select
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              value={reportSchedule.frequency}
              onChange={(e) => updateReportSchedule({ frequency: e.target.value })}
            >
              <option value="WEEKLY">هفتگی</option>
              <option value="MONTHLY">ماهانه</option>
            </select>
            <Button variant="ghost" onClick={generateReportNow} disabled={generating}>
              {generating ? 'در حال ساخت...' : 'ساخت گزارش همین حالا'}
            </Button>
          </div>
        )}
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-gray-700">
                  {new Date(r.periodStart).toLocaleDateString('fa-IR')} تا {new Date(r.periodEnd).toLocaleDateString('fa-IR')} (
                  {r.frequency === 'MONTHLY' ? 'ماهانه' : 'هفتگی'})
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {r.summary.orderCount.toLocaleString('fa-IR')} سفارش — خالص {r.summary.netRevenue.toLocaleString('fa-IR')} تومان
                </p>
              </div>
            </div>
          ))}
          {reports.length === 0 && <p className="text-xs text-gray-500">هنوز گزارشی ساخته نشده است.</p>}
        </div>
      </Card>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">فروش بر اساس دسته‌بندی</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          {byCategory.map((c) => (
            <Card key={c.category}>
              <p className="text-sm text-gray-500">{c.category}</p>
              <p className="font-bold text-gray-800">{c.revenue.toLocaleString('fa-IR')} تومان</p>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">ثبت هزینه جدید</h3>
        <form onSubmit={addExpense} className="grid sm:grid-cols-3 gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="دسته‌بندی هزینه"
            value={newExpense.category}
            onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="مبلغ (تومان)"
            type="number"
            value={newExpense.amount}
            onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder="توضیحات"
            value={newExpense.note}
            onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
          />
          <Button type="submit" className="sm:col-span-3">
            ثبت هزینه
          </Button>
        </form>
      </Card>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">هزینه‌های ثبت‌شده</h3>
        <div className="space-y-2">
          {expenses.map((exp) => (
            <Card key={exp.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">{exp.category}</p>
                <p className="text-xs text-gray-500">{exp.note}</p>
              </div>
              <p className="font-bold text-gray-800">{Number(exp.amount).toLocaleString('fa-IR')} تومان</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">تاریخچه تسویه‌حساب</h3>
        {payouts.length === 0 && <p className="text-gray-500 text-sm">هنوز تسویه‌ای ثبت نشده است.</p>}
        <div className="space-y-2">
          {payouts.map((payout) => (
            <Card key={payout.id} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800">
                  {new Date(payout.periodStart).toLocaleDateString('fa-IR')} تا{' '}
                  {new Date(payout.periodEnd).toLocaleDateString('fa-IR')}
                </p>
                <p className="font-bold text-gray-800 mt-1">{Number(payout.amount).toLocaleString('fa-IR')} تومان</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  payout.status === 'PAID' ? 'bg-primary-800 text-white' : 'border border-dashed border-gray-400 text-ink/60'
                }`}
              >
                {payout.status === 'PAID' ? 'پرداخت‌شده' : 'در انتظار پرداخت'}
              </span>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
