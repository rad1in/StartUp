import { X } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

export default function ItemPairingSuggestion({ suggestion, onAdd, onDismiss }) {
  const { t, n } = useLanguage();
  if (!suggestion) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-primary-50 border border-primary-200 rounded-xl p-3 mb-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-primary-700 font-medium mb-0.5">{t('components.itemPairingSuggestion.title')}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{suggestion.name}</p>
        <p className="text-xs text-gray-500">{n(Number(suggestion.price))} {t('menu.toman')}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button variant="secondary" onClick={() => onAdd(suggestion)}>
          + {t('menu.add')}
        </Button>
        <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 p-1 rounded" aria-label={t('common.close')}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
