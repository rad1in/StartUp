import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowRight, Coffee } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const FILE_BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// Print-ready A5 table poster — logo, table name, and a big QR code with a
// "scan to order" instruction. Rendered as a real page (not a generated PDF
// on the backend) so it reuses the exact Vazirmatn font + RTL layout the rest
// of the app already has correct; the browser's own print-to-PDF produces a
// clean, correctly-shaped Persian PDF with zero extra dependencies.
export default function TablePoster() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [venue, setVenue] = useState(null);
  const [table, setTable] = useState(null);

  useEffect(() => {
    if (!venueId) return;
    api.get(`/venues/${venueId}`).then(({ data }) => setVenue(data));
    api.get(`/venues/${venueId}/tables`).then(({ data }) => setTable(data.find((t) => t.id === tableId) || null));
  }, [venueId, tableId]);

  if (!venue || !table) {
    return <p className="p-8 text-ink/50">در حال بارگذاری پوستر...</p>;
  }

  return (
    <div className="min-h-screen bg-[#f1ede3] flex flex-col items-center py-8 px-4 print:bg-white print:p-0 print:block">
      {/* Toolbar — hidden when printing */}
      <div className="w-full max-w-[420px] flex items-center justify-between mb-5 print:hidden">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink/60 hover:text-ink">
          <ArrowRight size={16} />
          بازگشت
        </button>
        <button onClick={() => window.print()} className="btn-gold px-5 py-2.5 text-sm">
          <Printer size={16} />
          چاپ / دانلود PDF
        </button>
      </div>

      {/* The A5 poster itself */}
      <div
        className="poster-a5 relative w-full max-w-[420px] aspect-[148/210] bg-white rounded-[2rem] shadow-2xl overflow-hidden print:rounded-none print:shadow-none print:max-w-none print:aspect-auto print:w-full print:h-screen"
        style={{
          background: 'linear-gradient(165deg, #FDFCF8 0%, #F8EED5 100%)',
        }}
      >
        {/* Gold corner flourishes */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent-200/40 blur-2xl print:hidden" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-accent-300/30 blur-2xl print:hidden" />

        <div className="relative h-full flex flex-col items-center text-center px-8 py-10">
          {/* Logo / brand */}
          {venue.logoUrl ? (
            <img
              src={`${FILE_BASE_URL}${venue.logoUrl}`}
              alt={venue.name}
              className="w-20 h-20 rounded-2xl object-cover shadow-lg mb-4"
            />
          ) : (
            <span className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 flex items-center justify-center shadow-lg mb-4">
              <Coffee size={32} />
            </span>
          )}
          <h1 className="text-2xl font-black text-ink">{venue.name}</h1>
          <p className="text-sm text-ink/50 mt-1">{venue.address}</p>

          <div className="divider-gold w-full my-6" />

          <p className="text-base font-extrabold text-accent-800">اسکن کن و سفارش بده</p>
          <p className="text-xs text-ink/45 mt-1 max-w-[240px]">
            کد زیر را با دوربین گوشی خود اسکن کنید تا مستقیم به منوی این میز برسید.
          </p>

          {/* QR code */}
          <div className="mt-6 p-4 bg-white rounded-3xl shadow-xl border-4 border-white">
            <img
              src={`${FILE_BASE_URL}/api/venues/${venueId}/tables/${tableId}/qrcode.png`}
              alt="کد QR میز"
              className="w-44 h-44"
            />
          </div>

          <div className="mt-6 chip-gold text-base px-6 py-2">میز {table.tableNumber}</div>

          <div className="flex-1" />

          <p className="text-[11px] text-ink/35 mt-6">ET-Cafe</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A5 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
