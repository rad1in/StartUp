const { pool } = require('../../lib/db');

// --- Pluggable strategy ---
// A strategy fn receives (history, targetDates) and returns Prediction[].
// history: [{ date: 'YYYY-MM-DD', dayOfWeek: 0-6, orders: N, revenue: R }]
// targetDates: Date[] of upcoming dates to forecast
// returns: [{ date, dayOfWeek, forecastOrders, forecastRevenue, confidence, pctVsBaseline }]

function movingAverageStrategy(history, targetDates) {
  if (history.length === 0) return targetDates.map((d) => emptyPrediction(d));

  // Build day-of-week baselines from full history
  const byDow = Array.from({ length: 7 }, () => ({ orders: [], revenue: [] }));
  for (const row of history) {
    byDow[row.dayOfWeek].orders.push(row.orders);
    byDow[row.dayOfWeek].revenue.push(row.revenue);
  }

  const dowBaseline = byDow.map((dow) => ({
    avgOrders: avg(dow.orders),
    avgRevenue: avg(dow.revenue),
    stdOrders: stdDev(dow.orders),
  }));

  // Trend: ratio of recent 14 days vs previous 14 days (days 15-28 ago)
  const sortedDesc = [...history].sort((a, b) => b.date.localeCompare(a.date));
  const recent14 = sortedDesc.slice(0, 14);
  const prev14 = sortedDesc.slice(14, 28);
  const recentAvg = avg(recent14.map((r) => r.orders));
  const prevAvg = avg(prev14.map((r) => r.orders));
  const trend = prevAvg > 0 ? Math.min(2.0, Math.max(0.5, recentAvg / prevAvg)) : 1.0;

  return targetDates.map((date) => {
    const dow = date.getDay(); // 0=Sunday
    const baseline = dowBaseline[dow];
    if (baseline.avgOrders === 0) return emptyPrediction(date);

    const forecastOrders = Math.round(baseline.avgOrders * trend);
    const forecastRevenue = Math.round(baseline.avgRevenue * trend);
    const cv = baseline.stdOrders / Math.max(1, baseline.avgOrders); // coefficient of variation
    const confidence = cv < 0.2 ? 'HIGH' : cv < 0.5 ? 'MEDIUM' : 'LOW';
    const pctVsBaseline = baseline.avgOrders > 0
      ? Math.round(((forecastOrders - baseline.avgOrders) / baseline.avgOrders) * 100)
      : 0;

    return {
      date: formatDate(date),
      dayOfWeek: dow,
      forecastOrders,
      forecastRevenue,
      confidence,
      pctVsBaseline,
    };
  });
}

function avg(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((s, v) => s + Number(v), 0) / arr.length;
}

function stdDev(arr) {
  if (!arr || arr.length < 2) return 0;
  const mean = avg(arr);
  const variance = arr.reduce((s, v) => s + Math.pow(Number(v) - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function emptyPrediction(date) {
  return { date: formatDate(date), dayOfWeek: date.getDay(), forecastOrders: 0, forecastRevenue: 0, confidence: 'LOW', pctVsBaseline: 0 };
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

const DOW_FA = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function buildInsights(predictions) {
  return predictions.map((p) => {
    const day = DOW_FA[p.dayOfWeek];
    if (p.forecastOrders === 0) {
      return { ...p, insight: `داده کافی برای پیش‌بینی ${day} وجود ندارد.` };
    }
    let insight;
    if (p.pctVsBaseline >= 20) {
      insight = `انتظار افزایش ~${p.pctVsBaseline}٪ سفارش در ${day} نسبت به میانگین تاریخی.`;
    } else if (p.pctVsBaseline <= -20) {
      insight = `انتظار کاهش ~${Math.abs(p.pctVsBaseline)}٪ سفارش در ${day} نسبت به میانگین تاریخی.`;
    } else {
      insight = `${day}: پیش‌بینی ${p.forecastOrders} سفارش، روند عادی.`;
    }
    return { ...p, insight };
  });
}

// Public API — strategy is swappable with no other changes needed.
async function forecastVenue(venueId, days = 7, strategy = movingAverageStrategy) {
  // Fetch 90 days of history
  const [rows] = await pool.query(
    `SELECT DATE(createdAt) AS date,
            DAYOFWEEK(createdAt) - 1 AS dayOfWeek,
            COUNT(*) AS orders,
            COALESCE(SUM(totalAmount), 0) AS revenue
     FROM \`Order\`
     WHERE venueId = ?
       AND paymentStatus = 'SUCCESS'
       AND createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
     GROUP BY DATE(createdAt)
     ORDER BY date ASC`,
    [venueId]
  );

  const history = rows.map((r) => ({
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
    dayOfWeek: Number(r.dayOfWeek),
    orders: Number(r.orders),
    revenue: Number(r.revenue),
  }));

  // Build target dates (tomorrow through tomorrow+days-1)
  const targetDates = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 1; i <= days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    targetDates.push(d);
  }

  const predictions = strategy(history, targetDates);
  return { predictions: buildInsights(predictions), historyDays: history.length };
}

module.exports = { forecastVenue };
