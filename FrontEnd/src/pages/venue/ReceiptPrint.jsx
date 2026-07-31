import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

// Narrow (80mm) monospace receipt formatted for thermal kitchen printers.
// Most thermal printers register as a normal OS print driver, so the
// browser's own print dialog (triggered automatically on load) is enough —
// no raw ESC/POS byte-wrangling or native driver needed.
export default function ReceiptPrint() {
  const { t, n, date } = useLanguage();
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [printed, setPrinted] = useState(false);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then(({ data }) => setOrder(data));
  }, [orderId]);

  useEffect(() => {
    if (order && !printed) {
      setPrinted(true);
      setTimeout(() => window.print(), 200);
    }
  }, [order, printed]);

  if (!order) return null;

  return (
    <div className="receipt">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 3mm; }
        }
        body { background: #fff; }
        .receipt {
          width: 76mm;
          margin: 0 auto;
          font-family: 'Courier New', monospace;
          color: #000;
          font-size: 12px;
          direction: rtl;
        }
        .receipt h1 { font-size: 15px; text-align: center; margin: 0 0 4px; }
        .receipt .muted { color: #333; text-align: center; font-size: 10px; margin-bottom: 8px; }
        .receipt hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .receipt .row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin: 2px 0; }
        .receipt .total { font-weight: bold; font-size: 14px; }
      `}</style>

      <h1>ET-Cafe</h1>
      <p className="muted">
        {order.venue?.name} — {t('venue.receipt.orderNumber')} #{order.id.slice(0, 8)}
        <br />
        {date(order.createdAt)}
        <br />
        {order.table ? `${t('common.table')} ${order.table.tableNumber}` : order.isPickup ? t('common.pickup') : t('common.online')}
      </p>
      <hr />
      {order.items.map((item) => (
        <div className="row" key={item.id}>
          <span>
            {item.menuItem?.name || item.combo?.name} × {item.quantity}
          </span>
          <span>{n(Number(item.subtotal))}</span>
        </div>
      ))}
      <hr />
      {Number(order.discountAmount) > 0 && (
        <div className="row">
          <span>{t('venue.receipt.discount')}</span>
          <span>-{n(Number(order.discountAmount))}</span>
        </div>
      )}
      <div className="row total">
        <span>{t('venue.receipt.total')}</span>
        <span>{n(Number(order.totalAmount))} {t('common.toman')}</span>
      </div>
      <hr />
      <p className="muted">{t('venue.receipt.thankYou')}</p>
    </div>
  );
}
