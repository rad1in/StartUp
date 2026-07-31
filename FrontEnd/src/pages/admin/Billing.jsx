import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Billing() {
  const { t, n, dateShort } = useLanguage();
  const tierLabels = { FREE: t('admin.billing.tierFree'), PRO: t('admin.billing.tierPro'), ULTRA: t('admin.billing.tierUltraPlus') };
  const [plans, setPlans] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [reconciliation, setReconciliation] = useState([]);
  const [refunds, setRefunds] = useState([]);

  async function refresh() {
    const [{ data: planData }, { data: payoutData }] = await Promise.all([
      api.get('/admin/plans'),
      api.get('/admin/payouts'),
    ]);
    setPlans(planData);
    setPayouts(payoutData);
    try {
      const { data: reconData } = await api.get('/admin/reports/reconciliation');
      setReconciliation(reconData);
      const { data: refundData } = await api.get('/admin/reports/refund-overview');
      setRefunds(refundData);
    } catch {
      // reports.view permission may not be granted to this account
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function updatePlan(tier, commissionRate) {
    await api.patch(`/admin/plans/${tier}`, { commissionRate });
    refresh();
  }

  async function markPaid(payout) {
    await api.patch(`/admin/payouts/${payout.id}/mark-paid`);
    refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.billing.plansAndCommission')}</h3>
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.tier} className="flex items-center justify-between gap-3">
              <span className="text-sm text-gray-700">{tierLabels[plan.tier] || plan.tier}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28"
                  defaultValue={plan.commissionRate}
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value !== plan.commissionRate) updatePlan(plan.tier, value);
                  }}
                />
                <span className="text-xs text-gray-500">{t('admin.billing.commissionRateHint')}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.billing.venuePayouts')}</h3>
        <div className="space-y-2">
          {payouts.map((payout) => (
            <div key={payout.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{payout.venueName}</span>
              <span className="text-gray-500">{n(Number(payout.amount))} {t('common.toman')}</span>
              <span className="text-xs text-gray-500">{payout.status}</span>
              {payout.status !== 'PAID' && (
                <Button variant="primary" onClick={() => markPaid(payout)}>
                  {t('admin.billing.markAsPaid')}
                </Button>
              )}
            </div>
          ))}
          {payouts.length === 0 && <p className="text-gray-500 text-sm">{t('admin.billing.noPayoutsRecorded')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.billing.reconciliationTitle')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="py-2">{t('admin.billing.venueColumn')}</th>
                <th className="py-2">{t('admin.billing.totalSalesColumn')}</th>
                <th className="py-2">{t('admin.billing.commissionColumn')}</th>
                <th className="py-2">{t('admin.billing.paidOutColumn')}</th>
                <th className="py-2">{t('admin.billing.netOwedColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.map((row) => (
                <tr key={row.venueId} className="border-b border-gray-100">
                  <td className="py-2">{row.venueName}</td>
                  <td className="py-2">{n(row.gmv)}</td>
                  <td className="py-2">{n(row.commission)}</td>
                  <td className="py-2">{n(row.paidOut)}</td>
                  <td className="py-2">{n(row.netOwed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {reconciliation.length === 0 && <p className="text-gray-500 text-sm py-2">{t('common.noDataToShow')}</p>}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('admin.billing.refundsTitle')}</h3>
        <div className="space-y-2">
          {refunds.map((refund) => (
            <div key={refund.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-1">
              <span>{refund.venueName}</span>
              <span className="text-gray-500">{n(Number(refund.amount))} {t('common.toman')}</span>
              <span className="text-xs text-gray-400">{dateShort(refund.createdAt)}</span>
            </div>
          ))}
          {refunds.length === 0 && <p className="text-gray-500 text-sm">{t('admin.billing.noRefundsRecorded')}</p>}
        </div>
      </Card>
    </div>
  );
}
