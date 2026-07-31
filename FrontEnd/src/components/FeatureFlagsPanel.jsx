import { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

// Runtime kill-switches for a handful of platform features — toggle without a
// redeploy. Only the platform owner (SUPER_ADMIN) can change these; the
// backend enforces that independently, this UI just doesn't render for
// anyone else.
export default function FeatureFlagsPanel() {
  const { user } = useAuth();
  const [flags, setFlags] = useState(null);
  const [defs, setDefs] = useState([]);
  const [busyKey, setBusyKey] = useState(null);

  useEffect(() => {
    if (user?.role !== 'SUPER_ADMIN') return;
    api.get('/admin/content/feature-flags').then(({ data }) => {
      setFlags(data.flags);
      setDefs(data.definitions);
    });
  }, [user]);

  if (user?.role !== 'SUPER_ADMIN') return null;

  async function toggle(key) {
    setBusyKey(key);
    try {
      const { data } = await api.patch('/admin/content/feature-flags', { [key]: !flags[key] });
      setFlags(data);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="card-luxe p-5">
      <h3 className="font-extrabold text-ink mb-1 flex items-center gap-2">
        <Flag size={17} className="text-accent-600" />
        پرچم‌های ویژگی (Feature Flags)
      </h3>
      <p className="text-xs text-ink/45 mb-4">فعال/غیرفعال‌سازی سراسری فیچرها بدون نیاز به دیپلوی مجدد.</p>

      {!flags && <p className="text-sm text-ink/40">در حال بارگذاری...</p>}

      <div className="space-y-2">
        {defs.map((def) => {
          const on = flags?.[def.key];
          return (
            <div key={def.key} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
              <span className="text-sm font-medium text-ink">{def.label}</span>
              <button
                onClick={() => toggle(def.key)}
                disabled={busyKey === def.key}
                className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-accent-500' : 'bg-gray-300'}`}
                aria-label={def.label}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'right-0.5' : 'right-[22px]'}`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
