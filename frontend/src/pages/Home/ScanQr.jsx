import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { XCircle, Camera, RefreshCw } from 'lucide-react';
import Button from '../../components/Button';

const SCAN_BOX = 260;

export default function ScanQr() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('idle'); // idle | starting | scanning | error | done
  const [error, setError] = useState('');
  const scannerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
  }, []);

  async function stopScanner() {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (_) { /* ignore */ }
  }

  async function startCamera() {
    setError('');
    setStatus('starting');

    await stopScanner();

    const scanner = new Html5Qrcode('qr-video-box', { verbose: false });
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: SCAN_BOX, height: SCAN_BOX }, aspectRatio: 1 },
        (decoded) => {
          if (!mountedRef.current) return;
          handleDecoded(decoded);
        },
        () => { /* per-frame error — ignore */ }
      );
      if (mountedRef.current) setStatus('scanning');
    } catch (err) {
      if (!mountedRef.current) return;
      if (err?.message?.includes('permission') || err?.name === 'NotAllowedError') {
        setError('دسترسی به دوربین رد شد. لطفاً مجوز دوربین را در مرورگر خود فعال کنید.');
      } else {
        setError('دوربین پیدا نشد یا قابل استفاده نیست.');
      }
      setStatus('error');
    }
  }

  async function handleDecoded(text) {
    setStatus('done');
    await stopScanner();

    // Try to parse as a URL pointing to this app's menu page
    try {
      const url = new URL(text);
      const path = url.pathname + url.search;
      if (path.startsWith('/menu/')) {
        navigate(path);
        return;
      }
    } catch (_) { /* not a URL */ }

    // Fallback: treat as a raw QR token (old format)
    navigate(`/scan/token?code=${encodeURIComponent(text)}`);
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col items-center gap-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-1">اسکن کد QR میز</h2>
        <p className="text-sm text-gray-500">دوربین را روی کد QR روی میز نگه دارید</p>
      </div>

      {/* Camera viewport */}
      <div className="w-full relative rounded-3xl overflow-hidden bg-gray-900 shadow-xl" style={{ aspectRatio: '1/1' }}>
        <div id="qr-video-box" className="w-full h-full" />

        {/* Scanning overlay — finder frame */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="relative border-2 border-white/80 rounded-2xl"
              style={{ width: SCAN_BOX, height: SCAN_BOX }}
            >
              {/* Corner accents */}
              {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute w-6 h-6 border-white border-4 rounded-sm ${pos}`}
                  style={{
                    borderRight: pos.includes('right') ? '4px solid white' : 'none',
                    borderLeft: pos.includes('left') ? '4px solid white' : 'none',
                    borderTop: pos.includes('top') ? '4px solid white' : 'none',
                    borderBottom: pos.includes('bottom') ? '4px solid white' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Idle / error states shown inside the box */}
        {(status === 'idle' || status === 'error') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-900/95">
            <Camera size={48} className="text-white/40" />
            {status === 'idle' && (
              <p className="text-white/60 text-sm">برای شروع اسکن دکمه زیر را بزنید</p>
            )}
            {error && (
              <p className="text-red-400 text-xs text-center px-6 flex items-center gap-1">
                <XCircle size={13} />{error}
              </p>
            )}
          </div>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <RefreshCw size={28} className="text-white animate-spin" />
          </div>
        )}

        {status === 'done' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="bg-white rounded-2xl px-5 py-3 text-sm font-medium text-gray-800">
              کد خوانده شد...
            </div>
          </div>
        )}
      </div>

      {(status === 'idle' || status === 'error') && (
        <Button className="w-full" onClick={startCamera}>
          <span className="flex items-center justify-center gap-2">
            <Camera size={18} />
            {status === 'error' ? 'تلاش مجدد' : 'باز کردن دوربین'}
          </span>
        </Button>
      )}

      {status === 'scanning' && (
        <Button variant="secondary" className="w-full" onClick={() => { stopScanner(); setStatus('idle'); }}>
          توقف اسکن
        </Button>
      )}

      <p className="text-xs text-gray-400 text-center">
        اگر کد QR روی میز دارید، دوربین گوشی خود را مستقیماً روی آن بگیرید — نیازی به باز کردن این صفحه نیست.
      </p>
    </div>
  );
}
