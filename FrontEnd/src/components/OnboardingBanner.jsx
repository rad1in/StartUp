import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

// A one-time, dismissible welcome banner shown to venue owners on their first
// visit to a given panel — persisted per-storageKey so it never nags again.
export default function OnboardingBanner({ storageKey, title, steps }) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === 'dismissed');

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(storageKey, 'dismissed');
    setDismissed(true);
  }

  return (
    <div className="card-luxe p-4 mb-4 relative animate-fade-up">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 left-3 text-ink/30 hover:text-ink/60"
        aria-label="بستن"
      >
        <X size={16} />
      </button>
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </span>
        <div>
          <p className="font-black text-ink text-sm">{title}</p>
          <ul className="mt-2 space-y-1.5">
            {steps.map((step, i) => (
              <li key={i} className="text-xs text-ink/60 flex items-start gap-1.5">
                <span className="w-4 h-4 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
