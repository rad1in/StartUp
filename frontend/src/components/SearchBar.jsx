import { Search, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

// Pill search field — leading icon, borderless input, optional clear button.
export default function SearchBar({ value, onChange, placeholder, className = '', ...props }) {
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t('searchBar.placeholder');
  return (
    <label className={`search-pill ${className}`}>
      <Search size={16} className="text-ink/40 shrink-0" />
      <input
        type="search"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="w-6 h-6 rounded-full bg-black/5 text-ink/50 flex items-center justify-center shrink-0 transition-colors hover:bg-black/10 hover:text-ink"
          aria-label={t('searchBar.clear')}
        >
          <X size={12} />
        </button>
      )}
    </label>
  );
}
