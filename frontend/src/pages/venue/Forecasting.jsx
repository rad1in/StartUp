import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Card from '../../components/Card';

const DOW_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const CONF_COLOR = { HIGH: 'text-green-600', MEDIUM: 'text-yellow-600', LOW: 'text-red-500' };
const CONF_LABEL = { HIGH: 'اطمینان بالا', MEDIUM: 'اطمینان متوسط', LOW: 'اطمینان پایین' };

function ForecastBar({ predictions }) {
  if (!predictions || predictions.length === 0) return null;
  const maxOrders = Math.max(...predictions.map((p) => p.forecastOrders), 1);
  const width = 560;
  const height = 160;
  const barW = width / predictions.length - 8;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40">
      {predictions.map((p, i) => {
        const barH = (p.forecastOrders / maxOrders) * (height - 40);
        const x = i * (width / predictions.length) + 4;
        const y = height - barH - 25;
        const fill = p.pctVsBaseline >= 20 ? '#16a34a' : p.pctVsBaseline <= -20 ? '#dc2626' : '#26241F';
        return (
          <g key={p.date}>
            <rect x={x} y={y} width={barW} height={barH} fill={fill} rx={4} opacity={0.85} />
            <text x={x + barW / 2} y={height - 10} fontSize="9" textAnchor="middle" fill="#6b7280">
              {DOW_FA[p.dayOfWeek].slice(0, 3)}
            </text>
            <text x={x + barW / 2} y={y - 4} fontSize="9" textAnchor="middle" fill="#374151">
              {p.forecastOrders}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Forecasting({ venueId: propVenueId, compact = false }) {
  const { user } = useAuth();
  const vid = propVenueId || user?.venueId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    if (!vid) return;
    setLoading(true);
    api.get(`/venues/${vid}/forecast`, { params: { days } })
      .then(({ data: d }) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [vid, days]);

  if (loading) return <Card><p className="text-gray-400 text-sm text-center py-4">در حال محاسبه پیش‌بینی...</p></Card>;
  if (!data) return null;

  const { predictions, historyDays } = data;
  const highAlerts = predictions.filter((p) => p.pctVsBaseline >= 20);
  const lowAlerts = predictions.filter((p) => p.pctVsBaseline <= -20);

  if (compact) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-800 text-sm">پیش‌بینی فروش ۷ روز آینده</h3>
          <span className="text-xs text-gray-400">بر اساس {historyDays} روز تاریخچه</span>
        </div>
        <ForecastBar predictions={predictions} />
        {highAlerts.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-green-700 mt-2 bg-green-50 px-2 py-1 rounded">
            <TrendingUp size={13} />{highAlerts[0].insight}
          </p>
        )}
        {lowAlerts.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-red-700 mt-1 bg-red-50 px-2 py-1 rounded">
            <TrendingDown size={13} />{lowAlerts[0].insight}
          </p>
        )}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">پیش‌بینی هوشمند فروش</h2>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                days === d ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-300 text-gray-600'
              }`}
            >
              {d} روز
            </button>
          ))}
        </div>
      </div>

      <Card>
        <p className="text-xs text-gray-400 mb-3">
          مدل: میانگین متحرک وزنی + ضریب فصلی روز هفته — بر اساس {historyDays} روز داده تاریخی
        </p>
        <ForecastBar predictions={predictions} />
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        {predictions.map((p) => (
          <Card key={p.date}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  {DOW_FA[p.dayOfWeek]} —{' '}
                  <span className="text-sm font-normal text-gray-500">
                    {new Date(p.date).toLocaleDateString('fa-IR')}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-1">{p.insight}</p>
              </div>
              <div className="text-right flex-shrink-0 mr-4">
                <p className="text-lg font-bold text-gray-900">{p.forecastOrders}</p>
                <p className="text-xs text-gray-400">سفارش</p>
                <p className="text-sm font-medium text-primary-700 mt-1">
                  {Number(p.forecastRevenue).toLocaleString('fa-IR')} تومان
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className={`text-xs font-medium ${CONF_COLOR[p.confidence]}`}>
                {CONF_LABEL[p.confidence]}
              </span>
              {p.pctVsBaseline !== 0 && (
                <span className={`text-xs font-medium ${p.pctVsBaseline > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {p.pctVsBaseline > 0 ? <TrendingUp size={12} className="inline" /> : <TrendingDown size={12} className="inline" />} {Math.abs(p.pctVsBaseline)}٪
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
