import { createContext, useContext, useMemo, useState } from 'react';

// One active cart at a time, always scoped to a single venue. Adding an item
// from a different venue replaces the cart (mirrors the web behaviour).
const CartContext = createContext(null);

// Two cart lines are "the same" only if both the menu item AND the chosen
// modifiers match exactly — mirrors web's JSON.stringify(modifierSelections)
// comparison, so e.g. a large oat-milk latte and a small latte stay separate
// lines instead of merging into one bogus quantity.
function lineKey(menuItemId, modifierSelections) {
  return `${menuItemId}::${JSON.stringify(modifierSelections || [])}`;
}

function priceAdjustmentFor(menuItem, modifierSelections) {
  return (modifierSelections || []).reduce((total, sel) => {
    const group = (menuItem.modifierGroups || []).find((g) => g.id === sel.groupId);
    if (!group) return total;
    return (
      total +
      (sel.optionIds || []).reduce((s, optId) => {
        const opt = (group.options || []).find((o) => o.id === optId);
        return s + Number(opt?.priceAdjustment || 0);
      }, 0)
    );
  }, 0);
}

// Human-readable "large, oat milk" summary shown under the cart line — the
// selections array only carries IDs, so this must run at add-time while we
// still have the full menuItem.modifierGroups (option names) in hand.
function summarize(menuItem, modifierSelections) {
  const names = [];
  for (const sel of modifierSelections || []) {
    const group = (menuItem.modifierGroups || []).find((g) => g.id === sel.groupId);
    if (!group) continue;
    for (const optId of sel.optionIds || []) {
      const opt = group.options.find((o) => o.id === optId);
      if (opt) names.push(opt.name);
    }
  }
  return names.join('، ');
}

export function CartProvider({ children }) {
  const [venue, setVenue] = useState(null); // { id, name, acceptsPickup }
  const [items, setItems] = useState([]); // [{ menuItemId, name, price, quantity, modifierSelections }]
  const [tableId, setTableId] = useState(null);

  function addItem(itemVenue, menuItem, modifierSelections = []) {
    const priceAdjustment = priceAdjustmentFor(menuItem, modifierSelections);
    const adjustedPrice = Number(menuItem.price) + priceAdjustment;
    const modifierSummary = summarize(menuItem, modifierSelections);
    const key = lineKey(menuItem.id, modifierSelections);
    const newLine = {
      menuItemId: menuItem.id,
      name: menuItem.name,
      price: adjustedPrice,
      quantity: 1,
      modifierSelections,
      modifierSummary,
    };

    if (!venue || venue.id !== itemVenue.id) {
      const wasReset = !!venue && venue.id !== itemVenue.id;
      setVenue(itemVenue);
      setItems([newLine]);
      setTableId(null);
      return wasReset;
    }
    setItems((prev) => {
      const existing = prev.find((i) => lineKey(i.menuItemId, i.modifierSelections) === key);
      if (existing) {
        return prev.map((i) =>
          lineKey(i.menuItemId, i.modifierSelections) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, newLine];
    });
    return false;
  }

  function incrementItem(menuItemId, modifierSelections = []) {
    const key = lineKey(menuItemId, modifierSelections);
    setItems((prev) =>
      prev.map((i) => (lineKey(i.menuItemId, i.modifierSelections) === key ? { ...i, quantity: i.quantity + 1 } : i))
    );
  }

  function decrementItem(menuItemId, modifierSelections = []) {
    const key = lineKey(menuItemId, modifierSelections);
    setItems((prev) =>
      prev
        .map((i) => (lineKey(i.menuItemId, i.modifierSelections) === key ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  }

  function clearCart() {
    setVenue(null);
    setItems([]);
    setTableId(null);
  }

  const totals = useMemo(() => {
    const count = items.reduce((sum, i) => sum + i.quantity, 0);
    const amount = items.reduce((sum, i) => sum + i.quantity * i.price, 0);
    return { count, amount };
  }, [items]);

  const quantityOf = (menuItemId, modifierSelections = []) => {
    const key = lineKey(menuItemId, modifierSelections);
    return items.find((i) => lineKey(i.menuItemId, i.modifierSelections) === key)?.quantity || 0;
  };

  return (
    <CartContext.Provider
      value={{
        venue,
        items,
        tableId,
        setTableId,
        addItem,
        incrementItem,
        decrementItem,
        clearCart,
        totals,
        quantityOf,
        lineKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
