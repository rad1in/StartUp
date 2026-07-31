import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Inline search + filter bar for the customer menu page. Purely client-side —
// filters an already-loaded item list, so no extra API round trip per keypress.
export default function MenuSearchFilter({ query, onQuery, customizableOnly, onCustomizableOnly, maxPrice, priceCeiling, onMaxPrice }) {
  const { t, n } = useLanguage();
  const [open, setOpen] = useState(false);
  const activeFilterCount = (customizableOnly ? 1 : 0) + (maxPrice < priceCeiling ? 1 : 0);

  return (
    <div className="mb-5">
      <div className="flex gap-2">
        <div className="search-pill flex-1">
          <Search size={16} className="text-ink/35 shrink-0" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('components.menuSearchFilter.searchPlaceholder')}
            type="search"
          />
          {query && (
            <button type="button" onClick={() => onQuery('')} className="text-ink/30 hover:text-ink shrink-0">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`relative shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
            open || activeFilterCount > 0 ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button' : 'glass text-ink/60'
          }`}
        >
          <SlidersHorizontal size={17} />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-accent-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="card-luxe p-4 mt-2 space-y-4 animate-pop-in">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm font-bold text-ink">{t('components.menuSearchFilter.customizableOnlyLabel')}</span>
            <input
              type="checkbox"
              checked={customizableOnly}
              onChange={(e) => onCustomizableOnly(e.target.checked)}
              className="w-5 h-5"
            />
          </label>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-ink">{t('components.menuSearchFilter.maxPriceLabel')}</span>
              <span className="text-xs text-accent-700 font-bold">{n(maxPrice)} {t('menu.toman')}</span>
            </div>
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={Math.max(1000, Math.round(priceCeiling / 50))}
              value={maxPrice}
              onChange={(e) => onMaxPrice(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
