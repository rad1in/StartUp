import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

const METRIC_DEFS = [
  { key: 'totalRevenue', label: 'درآمد', color: '#1D1B16', format: (v) => `${Number(v).toLocaleString('fa-IR')} تومان` },
  { key: 'totalOrders', label: 'تعداد سفارش', color: '#6C6960', format: (v) => Number(v).toLocaleString('fa-IR') },
  { key: 'avgOrderValue', label: 'میانگین ارزش سفارش', color: '#A9A496', format: (v) => `${Math.round(v).toLocaleString('fa-IR')} تومان` },
  { key: 'uniqueCustomers', label: 'مشتریان یکتا', color: '#C7A24A', format: (v) => Number(v).toLocaleString('fa-IR') },
];

function BranchComparisonChart({ branches }) {
  if (branches.length === 0) return <p className="text-gray-500 text-sm">داده‌ای برای مقایسه وجود ندارد.</p>;
  const withAvg = branches.map((b) => ({
    ...b,
    avgOrderValue: Number(b.totalOrders) > 0 ? Number(b.totalRevenue) / Number(b.totalOrders) : 0,
  }));

  return (
    <div className="space-y-5">
      {METRIC_DEFS.map((metric) => {
        const sorted = [...withAvg].sort((a, b) => Number(b[metric.key]) - Number(a[metric.key]));
        const max = Math.max(...sorted.map((b) => Number(b[metric.key])), 1);
        return (
          <div key={metric.key}>
            <p className="text-xs font-medium text-gray-500 mb-2">{metric.label}</p>
            <div className="space-y-1.5">
              {sorted.map((b, i) => (
                <div key={b.venueId} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-28 truncate shrink-0">
                    {i === 0 && Number(b[metric.key]) > 0 && '🏆 '}
                    {b.venueName}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(Number(b[metric.key]) / max) * 100}%`, backgroundColor: metric.color }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 w-32 text-left shrink-0">{metric.format(b[metric.key])}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function Branches() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const [brands, setBrands] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [brandForm, setBrandForm] = useState({ name: '', logoUrl: '' });
  const [editingBrand, setEditingBrand] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [report, setReport] = useState(null);
  const [reportDates, setReportDates] = useState({ from: '', to: '' });
  const [staff, setStaff] = useState([]);

  async function load() {
    // available-venues returns ONLY this owner's own venues that aren't linked
    // to a brand yet — the server is the source of truth, so another owner's
    // cafe can never appear in (or be added from) this list.
    const [{ data: b }, { data: v }] = await Promise.all([
      api.get('/brands'),
      api.get('/brands/available-venues'),
    ]);
    setBrands(b);
    setAllVenues(v);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!selectedBrand) return;
    api.get(`/brands/${selectedBrand}/report`, { params: reportDates }).then(({ data }) => setReport(data)).catch(() => {});
    api.get(`/brands/${selectedBrand}/staff`).then(({ data }) => setStaff(data)).catch(() => {});
  }, [selectedBrand, reportDates]);

  async function saveBrand(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (editingBrand) { await api.patch(`/brands/${editingBrand}`, brandForm); }
      else { await api.post('/brands', brandForm); }
      setBrandForm({ name: '', logoUrl: '' }); setEditingBrand(null);
      await load();
    } finally { setSaving(false); }
  }

  async function addVenueToBrand(brandId, venueId) {
    await api.post(`/brands/${brandId}/venues`, { venueId });
    await load();
  }

  async function removeVenueFromBrand(brandId, venueId) {
    await api.delete(`/brands/${brandId}/venues/${venueId}`);
    await load();
  }

  const unlinkedVenues = allVenues.filter((v) => !brands.some((b) => b.venues?.some((bv) => bv.id === v.id)));

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-gray-800">مدیریت برند و شعبات</h2>

      {/* Brand create/edit */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{editingBrand ? 'ویرایش برند' : 'ایجاد برند جدید'}</h3>
        <form onSubmit={saveBrand} className="flex gap-3 flex-wrap">
          <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48" placeholder="نام برند" value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} required />
          <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48" placeholder="آدرس لوگو (اختیاری)" value={brandForm.logoUrl} onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })} />
          <Button type="submit" disabled={saving}>{editingBrand ? 'بروزرسانی' : 'ایجاد برند'}</Button>
          {editingBrand && <Button type="button" variant="ghost" onClick={() => { setEditingBrand(null); setBrandForm({ name: '', logoUrl: '' }); }}>انصراف</Button>}
        </form>
      </Card>

      {/* Brand list with branch management */}
      {brands.map((brand) => (
        <Card key={brand.id}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {brand.logoUrl && <img src={brand.logoUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <h3 className="font-semibold text-gray-800">{brand.name}</h3>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => { setEditingBrand(brand.id); setBrandForm({ name: brand.name, logoUrl: brand.logoUrl || '' }); }}>ویرایش</Button>
              <Button variant={selectedBrand === brand.id ? 'secondary' : 'ghost'} onClick={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}>
                {selectedBrand === brand.id ? 'بستن داشبورد' : 'داشبورد مقایسه‌ای شعبات'}
              </Button>
              <Button variant="danger" onClick={async () => { if (await confirm('این برند حذف شود؟', { danger: true })) { await api.delete(`/brands/${brand.id}`); load(); } }}>حذف</Button>
            </div>
          </div>

          {/* Branches */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">شعبات ({brand.venues?.length || 0})</p>
            {(brand.venues || []).map((venue) => (
              <div key={venue.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{venue.name}</p>
                  <p className="text-xs text-gray-400">{venue.address}</p>
                </div>
                <Button variant="ghost" onClick={() => removeVenueFromBrand(brand.id, venue.id)}>جدا کردن</Button>
              </div>
            ))}
            {unlinkedVenues.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="text-xs text-gray-500 self-center">افزودن شعبه:</span>
                {unlinkedVenues.map((v) => (
                  <button key={v.id} onClick={() => addVenueToBrand(brand.id, v.id)}
                    className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded hover:border-primary-400 text-gray-600">
                    + {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Consolidated report */}
          {selectedBrand === brand.id && report && (
            <div className="mt-4 pt-4 border-t space-y-4">
              <div className="flex gap-3 flex-wrap">
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" value={reportDates.from} onChange={(e) => setReportDates({ ...reportDates, from: e.target.value })} />
                <input type="date" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" value={reportDates.to} onChange={(e) => setReportDates({ ...reportDates, to: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'کل سفارش‌ها', value: report.totals.totalOrders.toLocaleString('fa-IR') },
                  { label: 'کل درآمد', value: `${Number(report.totals.totalRevenue).toLocaleString('fa-IR')} تومان` },
                  { label: 'کل کمیسیون', value: `${Number(report.totals.totalCommission).toLocaleString('fa-IR')} تومان` },
                  { label: 'مشتریان یکتا', value: report.totals.uniqueCustomers.toLocaleString('fa-IR') },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                    <p className="font-bold text-gray-900 mt-1">{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">داشبورد مقایسه‌ای شعبات</p>
                <BranchComparisonChart branches={report.branches} />
              </div>
            </div>
          )}

          {/* Staff assignment */}
          {selectedBrand === brand.id && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">کارمندان شعبات</p>
              <div className="space-y-1">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1.5 bg-gray-50 rounded">
                    <span>{s.name} — {s.email}</span>
                    <span className="text-xs text-gray-400">{s.role}</span>
                  </div>
                ))}
                {staff.length === 0 && <p className="text-xs text-gray-400">هنوز کارمندی ثبت نشده.</p>}
              </div>
            </div>
          )}
        </Card>
      ))}

      {brands.length === 0 && (
        <p className="text-gray-500 text-sm">هنوز برندی ایجاد نشده. از فرم بالا شروع کنید.</p>
      )}
    </div>
  );
}
