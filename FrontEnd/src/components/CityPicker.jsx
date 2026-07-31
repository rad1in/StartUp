import { useEffect, useMemo, useState } from 'react';
import { MapPin, ChevronDown, X, Check } from 'lucide-react';
import { useCity } from '../context/CityContext';
import { POPULAR_CITIES } from '../constants/popularCities';
import SearchBar from './SearchBar';

// Header button + modal for choosing the browsing city — a short, curated
// list of well-known cities (not the full national directory), on a solid
// opaque surface so the labels stay readable over the page's aurora glow.
export default function CityPicker() {
  const { city, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const results = useMemo(() => {
    const term = query.trim();
    if (!term) return POPULAR_CITIES;
    return POPULAR_CITIES.filter((c) => c.name.includes(term));
  }, [query]);

  function choose(c) {
    setCity(c);
    setOpen(false);
    setQuery('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm font-bold text-ink/70 hover:text-ink transition-colors shrink-0"
        title="انتخاب شهر"
      >
        <MapPin size={15} className="text-accent-600" />
        <span className="max-w-[5.5rem] truncate">{city?.name || 'انتخاب شهر'}</span>
        <ChevronDown size={13} className="text-ink/40" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[10vh]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="bg-surface-2 rounded-3xl shadow-lift w-full max-w-md flex flex-col animate-pop-in"
            style={{ maxHeight: '75vh' }}
            dir="rtl"
          >
            <div className="p-5 pb-3 space-y-3.5 border-b border-ink/10">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-ink text-lg">انتخاب شهر</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 text-ink/50 flex items-center justify-center transition-colors hover:bg-black/10 hover:text-ink"
                  aria-label="بستن"
                >
                  <X size={15} />
                </button>
              </div>
              <SearchBar value={query} onChange={setQuery} placeholder="جستجو در شهرهای معروف..." autoFocus />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {results.length === 0 && (
                <p className="text-center text-ink/40 text-sm py-8">شهری با این نام پیدا نشد.</p>
              )}
              <ul className="grid grid-cols-2 gap-1.5">
                {results.map((c) => {
                  const active = city?.name === c.name;
                  return (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => choose(c)}
                        className={`w-full text-right px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
                          active
                            ? 'bg-accent-50 text-accent-800 font-bold border border-accent-200'
                            : 'bg-white text-ink/70 hover:bg-accent-50/60 hover:text-ink border border-transparent'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {active && <Check size={14} className="shrink-0" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
