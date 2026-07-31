import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { useLanguage } from '../../context/LanguageContext';

async function downloadCsv(endpoint, filename, format = 'csv') {
  const mime = format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv';
  const { data } = await api.get(endpoint, { params: { format }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([data], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/\.csv$/, `.${format}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function ExportButtons({ endpoint, filename }) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" onClick={() => downloadCsv(endpoint, filename, 'csv')}>
        CSV
      </Button>
      <Button variant="ghost" onClick={() => downloadCsv(endpoint, filename, 'xlsx')}>
        Excel
      </Button>
    </div>
  );
}

export default function Reports() {
  const { t, n } = useLanguage();
  const tierLabels = { FREE: t('admin.reports.tierFree'), PRO: t('admin.reports.tierPro'), ULTRA: t('admin.reports.tierUltra') };
  const [revenueByVenue, setRevenueByVenue] = useState([]);
  const [revenueByRegion, setRevenueByRegion] = useState([]);
  const [commissionByTier, setCommissionByTier] = useState([]);
  const [topVenues, setTopVenues] = useState([]);
  const [retention, setRetention] = useState(null);
  const [fraudFlags, setFraudFlags] = useState([]);

  useEffect(() => {
    api.get('/admin/reports/revenue-by-venue').then(({ data }) => setRevenueByVenue(data));
    api.get('/admin/reports/revenue-by-region').then(({ data }) => setRevenueByRegion(data));
    api.get('/admin/reports/commission-by-tier').then(({ data }) => setCommissionByTier(data));
    api.get('/admin/reports/top-venues').then(({ data }) => setTopVenues(data));
    api.get('/admin/reports/retention').then(({ data }) => setRetention(data));
    api.get('/admin/reports/fraud-flags').then(({ data }) => setFraudFlags(data));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{t('admin.reports.revenueByVenue')}</h3>
          <ExportButtons endpoint="/admin/reports/revenue-by-venue" filename="revenue-by-venue.csv" />
        </div>
        <div className="space-y-2">
          {revenueByVenue.slice(0, 10).map((row) => (
            <div key={row.venueId} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{row.venueName}</span>
              <span className="text-gray-500">{n(row.revenue)} {t('common.toman')}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">{t('admin.reports.revenueByRegion')}</h3>
          <ExportButtons endpoint="/admin/reports/revenue-by-region" filename="revenue-by-region.csv" />
        </div>
        <div className="space-y-2">
          {revenueByRegion.map((row) => (
            <div key={row.city} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{row.city}</span>
              <span className="text-gray-500">{n(row.revenue)} {t('common.toman')}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.reports.commissionByTier')}</h3>
        <div className="space-y-2">
          {commissionByTier.map((row) => (
            <div key={row.tier} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{tierLabels[row.tier] || row.tier}</span>
              <span className="text-gray-500">{n(row.commission)} {t('common.toman')} — {row.orderCount} {t('admin.reports.ordersWord')}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.reports.topSellingVenues')}</h3>
        <div className="space-y-2">
          {topVenues.map((row, i) => (
            <div key={row.venueId} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{i + 1}. {row.venueName}</span>
              <span className="text-gray-500">{n(row.revenue)} {t('common.toman')}</span>
            </div>
          ))}
        </div>
      </Card>

      {retention && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('admin.reports.customerRetentionRate')}</h3>
          <p className="text-sm text-gray-700">
            {n(retention.repeatCustomers)} {t('admin.reports.outOf')} {n(retention.totalCustomers)}{' '}
            {t('admin.reports.customersWithMoreThanOneOrder')} ({(retention.retentionRate * 100).toFixed(1)}٪)
          </p>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.reports.potentialFraudAlerts')}</h3>
        <div className="space-y-2">
          {fraudFlags.map((flag) => (
            <div key={flag.venueId} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{flag.venueName}</span>
              <span className="inline-flex items-center gap-1 text-ink text-xs font-bold"><AlertTriangle size={12} />{flag.flags.join('، ')}</span>
            </div>
          ))}
          {fraudFlags.length === 0 && <p className="text-gray-500 text-sm">{t('admin.reports.noItemsToReview')}</p>}
        </div>
      </Card>
    </div>
  );
}
