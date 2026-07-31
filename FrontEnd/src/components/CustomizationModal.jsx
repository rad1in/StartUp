import { useState } from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { useLanguage } from '../context/LanguageContext';

export default function CustomizationModal({ item, modifierGroups, onConfirm, onClose }) {
  const { t, n } = useLanguage();
  const [selections, setSelections] = useState(() => {
    const init = {};
    for (const group of modifierGroups) {
      if (group.type === 'SINGLE_SELECT') {
        const def = group.options.find((o) => o.isDefault);
        init[group.id] = def ? [def.id] : [];
      } else if (group.type === 'MULTI_SELECT') {
        init[group.id] = group.options.filter((o) => o.isDefault).map((o) => o.id);
      } else {
        // TOGGLE_REMOVE: defaults are "included" (selected)
        init[group.id] = group.options.filter((o) => o.isDefault).map((o) => o.id);
      }
    }
    return init;
  });

  function toggleOption(group, optionId) {
    setSelections((prev) => {
      const cur = prev[group.id] || [];
      if (group.type === 'SINGLE_SELECT') {
        return { ...prev, [group.id]: [optionId] };
      }
      const has = cur.includes(optionId);
      if (has) {
        return { ...prev, [group.id]: cur.filter((id) => id !== optionId) };
      }
      const max = group.maxSelections;
      if (max !== null && max !== undefined && cur.length >= max) return prev;
      return { ...prev, [group.id]: [...cur, optionId] };
    });
  }

  function isValid() {
    for (const group of modifierGroups) {
      const sel = selections[group.id] || [];
      if (group.isRequired && group.minSelections > 0 && sel.length < group.minSelections) return false;
      if (group.maxSelections !== null && group.maxSelections !== undefined && sel.length > group.maxSelections)
        return false;
    }
    return true;
  }

  const priceAdjustment = modifierGroups.reduce((total, group) => {
    return (
      total +
      (selections[group.id] || []).reduce((s, optId) => {
        const opt = group.options.find((o) => o.id === optId);
        return s + Number(opt?.priceAdjustment || 0);
      }, 0)
    );
  }, 0);

  function handleConfirm() {
    const modifierSelections = modifierGroups
      .map((group) => ({
        groupId: group.id,
        optionIds: selections[group.id] || [],
      }))
      .filter((s) => s.optionIds.length > 0);
    onConfirm(modifierSelections);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-800">{item.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded" aria-label={t('common.close')}>
            <X size={18} />
          </button>
        </div>

        {modifierGroups.map((group) => (
          <div key={group.id}>
            <div className="flex items-center gap-2 mb-2">
              <p className="font-medium text-gray-700 text-sm">{group.name}</p>
              {!!group.isRequired && (
                <span className="text-xs text-ink bg-ink/10 px-1.5 py-0.5 rounded">{t('venue.modifierGroups.required')}</span>
              )}
              {group.maxSelections !== null && group.maxSelections !== undefined && (
                <span className="text-xs text-gray-400">{t('components.customizationModal.maxPrefix')} {n(group.maxSelections)}</span>
              )}
            </div>

            {group.type === 'SINGLE_SELECT' && (
              <div className="space-y-1">
                {group.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={group.id}
                        checked={(selections[group.id] || []).includes(opt.id)}
                        onChange={() => toggleOption(group, opt.id)}
                        className="accent-primary-600"
                      />
                      <span className="text-sm">{opt.name}</span>
                    </div>
                    {Number(opt.priceAdjustment) !== 0 && (
                      <span className="text-xs text-primary-700 font-medium">
                        +{n(Number(opt.priceAdjustment))} {t('menu.toman')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {group.type === 'MULTI_SELECT' && (
              <div className="space-y-1">
                {group.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={(selections[group.id] || []).includes(opt.id)}
                        onChange={() => toggleOption(group, opt.id)}
                        className="accent-primary-600"
                      />
                      <span className="text-sm">{opt.name}</span>
                    </div>
                    {Number(opt.priceAdjustment) !== 0 && (
                      <span className="text-xs text-primary-700 font-medium">
                        +{n(Number(opt.priceAdjustment))} {t('menu.toman')}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}

            {group.type === 'TOGGLE_REMOVE' && (
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const active = (selections[group.id] || []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleOption(group, opt.id)}
                      className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                        active
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                      }`}
                    >
                      {opt.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        <div className="pt-3 border-t border-gray-100 space-y-3">
          {priceAdjustment !== 0 && (
            <p className="text-sm text-gray-600">
              {t('components.customizationModal.priceIncreaseLabel')} <span className="font-bold text-primary-700">+{n(priceAdjustment)} {t('menu.toman')}</span>
            </p>
          )}
          <p className="text-sm font-bold text-gray-800">
            {t('components.customizationModal.finalPriceLabel')} {n(Number(item.price) + priceAdjustment)} {t('menu.toman')}
          </p>
          <Button className="w-full" onClick={handleConfirm} disabled={!isValid()}>
            {t('components.customizationModal.confirm')}
          </Button>
        </div>
      </div>
    </div>
  );
}
