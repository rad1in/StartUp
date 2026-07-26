import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';

function BranchComparisonChart({ branches }) {
  const { t } = useLanguage();
  const METRIC_DEFS = [
    { key: 'totalRevenue', label: t('venue.branches.metricRevenue'), color: '#1D1B16', format: (v) => `${Number(v).toLocaleString('fa-IR')} ${t('common.toman')}` },
    { key: 'totalOrders', label: t('venue.branches.metricOrderCount'), color: '#6C6960', format: (v) => Number(v).toLocaleString('fa-IR') },
    { key: 'avgOrderValue', label: t('venue.branches.metricAvgOrderValue'), color: '#A9A496', format: (v) => `${Math.round(v).toLocaleString('fa-IR')} ${t('common.toman')}` },
    { key: 'uniqueCustomers', label: t('venue.branches.metricUniqueCustomers'), color: '#C7A24A', format: (v) => Number(v).toLocaleString('fa-IR') },
  ];

  if (branches.length === 0) return <p className="text-gray-500 text-sm">{t('venue.branches.noComparisonData')}</p>;
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
                  <span className="text-xs text-gray-600 w-28 truncate shrink-0 inline-flex items-center gap-1">
                    {i === 0 && Number(b[metric.key]) > 0 && <Trophy size={11} className="text-accent-600 shrink-0" />}
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
  const { t } = useLanguage();
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
      <h2 className="text-lg font-bold text-gray-800">{t('venue.branches.title')}</h2>

      {/* Brand create/edit */}
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{editingBrand ? t('venue.branches.editBrand') : t('venue.branches.createNewBrand')}</h3>
        <form onSubmit={saveBrand} className="flex gap-3 flex-wrap">
          <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48" placeholder={t('venue.branches.brandName')} value={brandForm.name} onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })} required />
          <input className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-48" placeholder={t('venue.branches.logoUrlOptional')} value={brandForm.logoUrl} onChange={(e) => setBrandForm({ ...brandForm, logoUrl: e.target.value })} />
          <Button type="submit" disabled={saving}>{editingBrand ? t('venue.branches.update') : t('venue.branches.createBrand')}</Button>
          {editingBrand && <Button type="button" variant="ghost" onClick={() => { setEditingBrand(null); setBrandForm({ name: '', logoUrl: '' }); }}>{t('common.cancel')}</Button>}
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
              <Button variant="ghost" onClick={() => { setEditingBrand(brand.id); setBrandForm({ name: brand.name, logoUrl: brand.logoUrl || '' }); }}>{t('common.edit')}</Button>
              <Button variant={selectedBrand === brand.id ? 'secondary' : 'ghost'} onClick={() => setSelectedBrand(selectedBrand === brand.id ? null : brand.id)}>
                {selectedBrand === brand.id ? t('venue.branches.closeDashboard') : t('venue.branches.comparisonDashboard')}
              </Button>
              <Button variant="danger" onClick={async () => { if (await confirm(t('venue.branches.confirmDeleteBrand'), { danger: true })) { await api.delete(`/brands/${brand.id}`); load(); } }}>{t('common.delete')}</Button>
            </div>
          </div>

          {/* Branches */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('venue.branches.branches')} ({brand.venues?.length || 0})</p>
            {(brand.venues || []).map((venue) => (
              <div key={venue.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-800">{venue.name}</p>
                  <p className="text-xs text-gray-400">{venue.address}</p>
                </div>
                <Button variant="ghost" onClick={() => removeVenueFromBrand(brand.id, venue.id)}>{t('venue.branches.detach')}</Button>
              </div>
            ))}
            {unlinkedVenues.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                <span className="text-xs text-gray-500 self-center">{t('venue.branches.addBranch')}</span>
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
                  { label: t('venue.branches.kpiTotalOrders'), value: report.totals.totalOrders.toLocaleString('fa-IR') },
                  { label: t('venue.branches.kpiTotalRevenue'), value: `${Number(report.totals.totalRevenue).toLocaleString('fa-IR')} ${t('common.toman')}` },
                  { label: t('venue.branches.kpiTotalCommission'), value: `${Number(report.totals.totalCommission).toLocaleString('fa-IR')} ${t('common.toman')}` },
                  { label: t('venue.branches.metricUniqueCustomers'), value: report.totals.uniqueCustomers.toLocaleString('fa-IR') },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                    <p className="font-bold text-gray-900 mt-1">{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">{t('venue.branches.comparisonDashboard')}</p>
                <BranchComparisonChart branches={report.branches} />
              </div>
            </div>
          )}

          {/* Staff assignment */}
          {selectedBrand === brand.id && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{t('venue.branches.branchStaff')}</p>
              <div className="space-y-1">
                {staff.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm px-2 py-1.5 bg-gray-50 rounded">
                    <span>{s.name} — {s.email}</span>
                    <span className="text-xs text-gray-400">{s.role}</span>
                  </div>
                ))}
                {staff.length === 0 && <p className="text-xs text-gray-400">{t('venue.branches.noStaffYet')}</p>}
              </div>
            </div>
          )}
        </Card>
      ))}

      {brands.length === 0 && (
        <p className="text-gray-500 text-sm">{t('venue.branches.noBrandsYet')}</p>
      )}
    </div>
  );
}
