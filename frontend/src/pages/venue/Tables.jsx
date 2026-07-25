import { useEffect, useState } from 'react';
import { QrCode, Link2, Pencil, Trash2, Check, Plus, Armchair, Printer } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useVenuePermissions } from '../../hooks/useVenuePermissions';
import { useConfirm } from '../../context/ConfirmContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Tables() {
  const { user } = useAuth();
  const { has } = useVenuePermissions();
  const confirm = useConfirm();
  const venueId = user?.venueId;
  const [tables, setTables] = useState([]);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  async function refresh() {
    const { data } = await api.get(`/venues/${venueId}/tables`);
    setTables(data);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function addTable(e) {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    await api.post(`/venues/${venueId}/tables`, { tableNumber: newTableNumber });
    setNewTableNumber('');
    refresh();
  }

  async function renameTable(table) {
    const tableNumber = window.prompt('شماره/نام جدید میز:', table.tableNumber);
    if (!tableNumber) return;
    await api.patch(`/venues/${venueId}/tables/${table.id}`, { tableNumber });
    refresh();
  }

  async function removeTable(table) {
    if (!(await confirm('این میز حذف شود؟', { danger: true }))) return;
    await api.delete(`/venues/${venueId}/tables/${table.id}`);
    refresh();
  }

  async function downloadQr(table) {
    const { data } = await api.get(`/venues/${venueId}/tables/${table.id}/qrcode.png`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([data], { type: 'image/png' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-${table.tableNumber}-qr.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  // The link a QR points to — same URL the customer lands on when scanning.
  function tableLink(table) {
    return `${window.location.origin}/menu/${venueId}?table=${table.id}`;
  }

  async function copyLink(table) {
    const link = tableLink(table);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for insecure contexts where the Clipboard API is unavailable.
      const ta = document.createElement('textarea');
      ta.value = link;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopiedId(table.id);
    setTimeout(() => setCopiedId((id) => (id === table.id ? null : id)), 1800);
  }

  if (!venueId) return <p className="text-gray-500">این حساب کاربری به مجموعه‌ای متصل نیست.</p>;
  const canManage = has('settings.manage');

  return (
    <div className="space-y-6">
      {canManage && (
        <Card>
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
            <Armchair size={18} className="text-accent-600" />
            افزودن میز جدید
          </h3>
          <form onSubmit={addTable} className="flex gap-2">
            <input
              className="glass-input flex-1 rounded-xl px-3 py-2"
              placeholder="شماره یا نام میز"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
            />
            <button type="submit" className="btn-gold px-5">
              <Plus size={16} />
              افزودن
            </button>
          </form>
        </Card>
      )}

      {tables.length === 0 && (
        <p className="text-ink/50 text-sm text-center py-8">هنوز میزی ثبت نشده است.</p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tables.map((table) => (
          <div key={table.id} className="card-luxe p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
                  <Armchair size={18} />
                </span>
                <p className="font-extrabold text-ink">میز {table.tableNumber}</p>
              </div>
              <span
                className={`text-[11px] font-bold px-2 py-1 rounded-full ${
                  table.isActive
                    ? 'bg-green-100 text-green-700 border border-green-200'
                    : 'bg-gray-100 text-ink/45 border border-gray-200'
                }`}
              >
                {table.isActive ? 'فعال' : 'آزاد'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => downloadQr(table)}
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-primary-800 text-white hover:bg-primary-900 transition-colors active:scale-95"
              >
                <QrCode size={14} />
                دانلود QR
              </button>
              <button
                onClick={() => copyLink(table)}
                className={`flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl border transition-all active:scale-95 ${
                  copiedId === table.id
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-surface-2/60 text-ink/70 border-black/10 hover:border-accent-300 hover:text-ink'
                }`}
              >
                {copiedId === table.id ? <Check size={14} /> : <Link2 size={14} />}
                {copiedId === table.id ? 'کپی شد!' : 'کپی لینک'}
              </button>

              <Link
                to={`/venue/tables/${table.id}/poster`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-surface-2/60 text-accent-700 border border-accent-200/70 hover:bg-accent-500 hover:text-white hover:border-accent-500 transition-all active:scale-95"
              >
                <Printer size={14} />
                پوستر چاپی
              </Link>

              {canManage && (
                <>
                  <button
                    onClick={() => renameTable(table)}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-surface-2/60 text-ink/70 border border-black/10 hover:border-accent-300 hover:text-ink transition-all active:scale-95"
                  >
                    <Pencil size={14} />
                    ویرایش
                  </button>
                  <button
                    onClick={() => removeTable(table)}
                    className="flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-surface-2/60 text-red-600 border border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all active:scale-95"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
