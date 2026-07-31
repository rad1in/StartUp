import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import Button from '../components/Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { message, title, danger, resolve }

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      setState({ message, title: opts.title || 'تایید عملیات', danger: opts.danger ?? false, resolve });
    });
  }, []);

  function close(result) {
    state?.resolve(result);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => e.target === e.currentTarget && close(false)}
          >
            <div className="glass-strong rounded-3xl shadow-lift w-full max-w-sm p-6 space-y-4 animate-pop-in" dir="rtl">
              <div className="flex items-center gap-3">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    state.danger ? 'bg-red-100 text-red-600' : 'bg-accent-100 text-accent-700'
                  }`}
                >
                  <AlertTriangle size={18} />
                </span>
                <h3 className="font-black text-ink">{state.title}</h3>
              </div>
              <p className="text-sm text-ink/60">{state.message}</p>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" onClick={() => close(false)}>
                  انصراف
                </Button>
                <Button variant={state.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
                  تایید
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
