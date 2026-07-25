import { X, Minus, Plus, ShoppingBag, CreditCard } from 'lucide-react';

export default function CartDrawer({
  cart,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  submitting,
  discountAmount = 0,
  readOnlyQuantity = false,
  checkoutLabel = 'ثبت و پرداخت سفارش',
  children,
}) {
  const subtotal = cart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const total = Math.max(subtotal - discountAmount, 0);

  if (cart.length === 0) {
    return (
      <div className="text-center py-8 mt-6">
        <ShoppingBag size={30} className="mx-auto text-ink/20 mb-2" />
        <p className="text-ink/50 text-sm">سبد سفارش شما خالی است.</p>
      </div>
    );
  }

  return (
    <div className="sticky bottom-3 mt-6 glass-strong rounded-3xl shadow-lift p-5 animate-fade-up">
      <h3 className="font-extrabold text-ink mb-3 flex items-center gap-2">
        <ShoppingBag size={17} className="text-accent-600" />
        سبد سفارش
        <span className="text-xs font-bold bg-accent-50 border border-accent-200/70 text-accent-800 px-2 py-0.5 rounded-full">
          {cart.reduce((n, i) => n + i.quantity, 0).toLocaleString('fa-IR')} قلم
        </span>
      </h3>
      <ul className="space-y-2.5 mb-3">
        {cart.map((item, idx) => (
          <li key={`${item.id}-${idx}`} className="flex items-start justify-between text-sm">
            <div className="flex-1 min-w-0">
              <span className="font-medium text-ink">{item.name}</span>
              {item.modifierSelections?.length > 0 && (
                <span className="block text-xs text-ink/40 mt-0.5">
                  {summarizeModifiers(item.modifierSelections, item.modifierGroups)}
                </span>
              )}
              {item.addedByLabel && (
                <span className="block text-xs text-ink/40">افزوده شده توسط {item.addedByLabel}</span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mr-2">
              {readOnlyQuantity ? (
                <>
                  <span className="text-ink/70">{item.quantity} عدد</span>
                  <button
                    onClick={() => onRemove?.(item)}
                    className="w-6 h-6 rounded-full bg-red-50 border border-red-200 text-red-500 flex items-center justify-center transition-colors hover:bg-red-500 hover:text-white"
                    aria-label="حذف"
                  >
                    <X size={12} />
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center glass rounded-full p-0.5">
                  <button
                    onClick={() => onDecrement(item)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-ink/60 transition-colors hover:bg-black/5 hover:text-ink active:scale-90"
                    aria-label="کاهش"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-6 text-center font-bold text-ink">{item.quantity.toLocaleString('fa-IR')}</span>
                  <button
                    onClick={() => onIncrement(item)}
                    className="w-7 h-7 rounded-full flex items-center justify-center bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-sm transition-transform active:scale-90"
                    aria-label="افزایش"
                  >
                    <Plus size={13} />
                  </button>
                </span>
              )}
              <span className="w-24 text-left font-medium text-ink/80">
                {(Number(item.price) * item.quantity).toLocaleString('fa-IR')} تومان
              </span>
            </div>
          </li>
        ))}
      </ul>

      {children}

      <div className="border-t border-dashed border-ink/10 pt-3 space-y-1.5">
        <div className="flex items-center justify-between text-sm text-ink/60">
          <span>جمع جزء</span>
          <span>{subtotal.toLocaleString('fa-IR')} تومان</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex items-center justify-between text-sm text-green-600 font-medium">
            <span>تخفیف</span>
            <span>-{discountAmount.toLocaleString('fa-IR')} تومان</span>
          </div>
        )}
        <div className="flex items-center justify-between font-extrabold text-ink text-base pb-1">
          <span>جمع کل</span>
          <span className="text-accent-700">{total.toLocaleString('fa-IR')} تومان</span>
        </div>
      </div>
      <button type="button" className="btn-pay py-3.5 text-base" onClick={onCheckout} disabled={submitting}>
        <CreditCard size={18} />
        {submitting ? 'در حال پرداخت...' : checkoutLabel}
      </button>
    </div>
  );
}

function summarizeModifiers(modifierSelections, modifierGroups) {
  if (!modifierSelections || modifierSelections.length === 0) return null;
  const optionMap = new Map();
  if (modifierGroups) {
    for (const g of modifierGroups) {
      for (const o of g.options || []) optionMap.set(o.id, o.name);
    }
  }
  const names = modifierSelections.flatMap((sel) => {
    const ids = sel.optionIds || (sel.optionId ? [sel.optionId] : []);
    return ids.map((id) => optionMap.get(id) || sel.optionName || null).filter(Boolean);
  });
  return names.length > 0 ? names.join('، ') : null;
}
