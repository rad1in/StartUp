import { useState } from 'react';
import { Heart, ZoomIn, ImageOff } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import CustomizationModal from './CustomizationModal';
import ImageLightbox from './ImageLightbox';
import { useLanguage } from '../context/LanguageContext';

export default function MenuItemCard({ item, onAdd, isFavorite, onToggleFavorite }) {
  const { t, n } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

  function handleAdd() {
    if (hasModifiers) {
      setShowModal(true);
    } else {
      onAdd(item, []);
    }
  }

  function handleConfirm(modifierSelections) {
    setShowModal(false);
    onAdd(item, modifierSelections);
  }

  return (
    <>
      <Card className={`flex items-center justify-between gap-4 hover:shadow-lift transition-shadow ${!item.isAvailable ? 'opacity-60' : ''}`}>
        {item.imageUrl ? (
          <button
            type="button"
            onClick={() => setShowLightbox(true)}
            className="group relative w-16 h-16 shrink-0 rounded-2xl overflow-hidden order-first"
          >
            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
              <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
          </button>
        ) : (
          <span className="w-16 h-16 shrink-0 rounded-2xl order-first bg-black/[0.03] flex items-center justify-center text-ink/15">
            <ImageOff size={20} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-ink">{item.name}</h4>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(item)}
                className={`leading-none transition-all active:scale-90 ${
                  isFavorite ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
                }`}
                title={t('menu.favoriteTitle')}
              >
                <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
          {item.description && <p className="text-sm text-ink/50 mt-1 leading-relaxed">{item.description}</p>}
          <div className="flex items-center gap-2 mt-2">
            <p className="text-accent-700 font-extrabold tabular-nums">
              {n(item.price)} <span className="text-xs font-medium text-ink/40">{t('menu.toman')}</span>
            </p>
            {hasModifiers && (
              <span className="text-[10px] font-medium bg-accent-50 border border-accent-200/70 text-accent-800 px-2 py-0.5 rounded-full">
                {t('menu.customizable')}
              </span>
            )}
          </div>
        </div>
        <Button disabled={!item.isAvailable} onClick={handleAdd} className="shrink-0">
          {item.isAvailable ? `${t('menu.add')} +` : t('menu.unavailable')}
        </Button>
      </Card>

      {showModal && (
        <CustomizationModal
          item={item}
          modifierGroups={item.modifierGroups}
          onConfirm={handleConfirm}
          onClose={() => setShowModal(false)}
        />
      )}

      {showLightbox && item.imageUrl && (
        <ImageLightbox src={item.imageUrl} alt={item.name} onClose={() => setShowLightbox(false)} />
      )}
    </>
  );
}
