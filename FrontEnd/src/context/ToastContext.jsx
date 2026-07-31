import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

// Lets code outside the React tree (the window-level safety net in main.jsx
// that catches truly unhandled errors/rejections — i.e. a button click that
// otherwise would have done nothing and left the user guessing) show a toast
// without needing the useToast() hook.
let globalToastRef = null;
export function notifyGlobalError(message) {
  globalToastRef?.error(message);
}

const ICONS = { success: CheckCircle, error: XCircle, info: Info };
const STYLES = {
  success: 'border-green-200 bg-green-50 text-green-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  info: 'border-accent-200 bg-accent-50 text-accent-700',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      // Never render a raw Error/object — a caller that accidentally passes
      // one would otherwise dump "[object Object]" or leak internals.
      const text = typeof message === 'string' ? message : 'مشکلی پیش آمد. لطفاً دوباره تلاش کنید.';
      const id = ++counter.current;
      setToasts((prev) => [...prev, { id, message: text, type }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (msg, d) => showToast(msg, 'success', d),
    error: (msg, d) => showToast(msg, 'error', d),
    info: (msg, d) => showToast(msg, 'info', d),
  };

  useEffect(() => {
    globalToastRef = toast;
    return () => {
      globalToastRef = null;
    };
  });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="fixed bottom-4 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none sm:bottom-6">
          {toasts.map((t) => {
            const Icon = ICONS[t.type] || Info;
            return (
              <div
                key={t.id}
                className={`pointer-events-auto glass-strong border rounded-2xl shadow-lift px-4 py-3 flex items-center gap-2.5 max-w-sm w-full animate-pop-in ${STYLES[t.type]}`}
                role="status"
              >
                <Icon size={18} className="shrink-0" />
                <p className="text-sm font-medium flex-1">{t.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-current opacity-60 hover:opacity-100"
                  aria-label="بستن"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
