import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Heart, RotateCcw, Gift, CalendarClock, BellRing, Coffee, Zap, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useTableSession } from '../../hooks/useTableSession';
import { resolveImageUrl } from '../../components/VenueCards';
import { GATEWAY_LOGOS } from '../../utils/paymentGatewayLogos';
import Card from '../../components/Card';
import Button from '../../components/Button';
import MenuItemCard from '../../components/MenuItemCard';
import MenuCategoryNav from '../../components/MenuCategoryNav';
import MenuSearchFilter from '../../components/MenuSearchFilter';
import CartDrawer from '../../components/CartDrawer';
import ItemPairingSuggestion from '../../components/ItemPairingSuggestion';
import SplitBillPanel from '../../components/SplitBillPanel';
import ReviewsSection from '../../components/ReviewsSection';
import ReservationModal from '../../components/ReservationModal';
import { useToast } from '../../context/ToastContext';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLanguage } from '../../context/LanguageContext';

const FILE_BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function sessionStorageKey(sessionId) {
  return `tableSession:${sessionId}:participantId`;
}

export default function VenueMenuPage() {
  const { venueId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tableId = searchParams.get('table') || null;
  const sessionId = searchParams.get('session') || null;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  // Table number modal — shown when user tries to checkout without a tableId
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableInput, setTableInput] = useState('');
  const [tableError, setTableError] = useState('');
  const [tableResolving, setTableResolving] = useState(false);

  const [venue, setVenue] = useState(null);
  usePageTitle(venue ? `${venue.name} ${t('menu.menuSuffix')}` : t('menu.pageTitleGeneric'));
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [combos, setCombos] = useState([]);
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const [couponCode, setCouponCode] = useState('');
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletAmount, setWalletAmount] = useState(0);
  const [punchCardPlans, setPunchCardPlans] = useState([]);
  const [myPunchCards, setMyPunchCards] = useState([]);
  const [selectedPunchCardId, setSelectedPunchCardId] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState('');

  const [isFavoriteVenue, setIsFavoriteVenue] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [waiterCalling, setWaiterCalling] = useState(false);
  const [waiterCalledAt, setWaiterCalledAt] = useState(null);
  const [flags, setFlags] = useState({ groupOrdering: true, reservations: true });
  const [favoriteItemIds, setFavoriteItemIds] = useState(new Set());

  // Search + filter (client-side, over the already-loaded item list)
  const [menuQuery, setMenuQuery] = useState('');
  const [customizableOnly, setCustomizableOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0);

  // Last order at this venue — offered as a one-tap "reorder" shortcut
  const [lastOrder, setLastOrder] = useState(null);
  const [reordering, setReordering] = useState(false);

  // Automatic no-code happy-hour discount, if one is active right now.
  const [happyHour, setHappyHour] = useState(null);

  // "You might also like" — personalized from order history, or this
  // venue's best-sellers as a fallback for guests/new customers.
  const [recommendations, setRecommendations] = useState([]);

  // Pairing suggestions
  const [suggestion, setSuggestion] = useState(null);
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const suggestionDebounce = useRef(null);
  const suggestionDismissedRef = useRef(false);

  // Saved cart resume banner
  const [savedCartItems, setSavedCartItems] = useState(null);
  const [savedCartBannerDismissed, setSavedCartBannerDismissed] = useState(false);
  const cartAutoSaveDebounce = useRef(null);

  // Split bill
  const [completedOrder, setCompletedOrder] = useState(null);
  const [billShares, setBillShares] = useState([]);
  const [showSplitPanel, setShowSplitPanel] = useState(false);

  // --- Shared-table group ordering ---
  const [myParticipantId, setMyParticipantId] = useState(() =>
    sessionId ? sessionStorage.getItem(sessionStorageKey(sessionId)) : null
  );
  const [joiningSession, setJoiningSession] = useState(Boolean(sessionId) && !myParticipantId);
  const [startingSession, setStartingSession] = useState(false);
  const { session } = useTableSession(sessionId, myParticipantId);

  useEffect(() => {
    api.get('/content/feature-flags').then(({ data }) => setFlags(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sessionId || myParticipantId) return;
    let guestName;
    if (!user || user.role !== 'CUSTOMER') {
      guestName = window.prompt(t('menu.joinGroupOrderPrompt'), t('menu.guestDefaultName'));
      if (!guestName) { setJoiningSession(false); return; }
    }
    api
      .post(`/table-sessions/${sessionId}/join`, guestName ? { guestName } : {})
      .then(({ data }) => {
        const participantId = data.you?.id;
        if (participantId) {
          sessionStorage.setItem(sessionStorageKey(sessionId), participantId);
          setMyParticipantId(participantId);
        }
      })
      .finally(() => setJoiningSession(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    api.get(`/venues/${venueId}`).then(({ data }) => setVenue(data));
    api.get(`/menu/${venueId}/categories`).then(({ data }) => setCategories(data));
    api
      .get(`/menu/${venueId}/items`)
      .then(({ data }) => {
        setItems(data);
        const ceiling = data.reduce((max, i) => Math.max(max, Number(i.price)), 0);
        setMaxPrice(ceiling);
      });
    api.get(`/menu/${venueId}/combos`).then(({ data }) => setCombos(data));
    api
      .get(`/venues/${venueId}/happy-hour/active`)
      .then(({ data }) => setHappyHour(data.active ? data.rule : null))
      .catch(() => setHappyHour(null));
    api
      .get(`/menu/${venueId}/recommendations`)
      .then(({ data }) => setRecommendations(data))
      .catch(() => setRecommendations([]));
  }, [venueId]);

  // Offer a one-tap reorder of the customer's most recent order at this venue.
  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return;
    api
      .get('/orders/mine', { params: { venueId } })
      .then(({ data }) => setLastOrder(data[0] || null))
      .catch(() => {});
  }, [user, venueId]);

  useEffect(() => {
    if (user?.role === 'CUSTOMER') {
      api.get('/loyalty/balance', { params: { venueId } }).then(({ data }) => setLoyaltyBalance(data.balance));
      api.get('/wallet').then(({ data }) => setWalletBalance(data.balance)).catch(() => {});
      api.get('/favorites/venues').then(({ data }) => setIsFavoriteVenue(data.some((v) => v.id === venueId)));
      api.get('/favorites/items').then(({ data }) => setFavoriteItemIds(new Set(data.map((i) => i.id))));
      refreshPunchCards();
    }
    api.get(`/venues/${venueId}/punch-cards/public`).then(({ data }) => setPunchCardPlans(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, venueId]);

  useEffect(() => {
    api.get('/payments/methods').then(({ data }) => {
      setPaymentMethods(data);
      setSelectedProvider((prev) => prev || data[0]?.name || 'mock');
    }).catch(() => {});
  }, []);

  async function refreshPunchCards() {
    const { data } = await api.get(`/venues/${venueId}/punch-cards/mine`).catch(() => ({ data: [] }));
    setMyPunchCards(data);
  }

  async function buyPunchCard(planId) {
    try {
      await api.post(`/venues/${venueId}/punch-cards/${planId}/purchase`);
      toast.success(t('menu.punchCardPurchaseSuccess'));
      refreshPunchCards();
    } catch (err) {
      toast.error(err.response?.data?.message || t('menu.punchCardPurchaseError'));
    }
  }

  // Load saved cart on mount (only for CUSTOMER, no active session, empty local cart)
  useEffect(() => {
    if (user?.role !== 'CUSTOMER' || sessionId) return;
    api.get(`/cart/${venueId}`).then(({ data }) => {
      if (data && data.length > 0) setSavedCartItems(data);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, venueId, sessionId]);

  // Auto-save cart changes (debounced 800ms)
  useEffect(() => {
    if (user?.role !== 'CUSTOMER' || sessionId || cart.length === 0) return;
    clearTimeout(cartAutoSaveDebounce.current);
    cartAutoSaveDebounce.current = setTimeout(() => {
      const cartPayload = cart.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        kind: i.kind,
        modifierSelections: i.modifierSelections || [],
        modifierGroups: i.modifierGroups || [],
      }));
      api.put(`/cart/${venueId}`, { items: cartPayload }).catch(() => {});
    }, 800);
    return () => clearTimeout(cartAutoSaveDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  // Keep ref in sync so the debounced callback always sees the latest value
  useEffect(() => { suggestionDismissedRef.current = suggestionDismissed; }, [suggestionDismissed]);

  // Fetch pairing suggestion whenever cart changes (debounced 300ms)
  useEffect(() => {
    clearTimeout(suggestionDebounce.current);
    if (cart.length === 0 || suggestionDismissedRef.current) return;
    const menuItemIds = cart.filter((i) => i.kind !== 'combo').map((i) => i.id);
    if (menuItemIds.length === 0) return;
    suggestionDebounce.current = setTimeout(() => {
      api
        .get(`/menu/${venueId}/pairings/suggestions`, { params: { items: menuItemIds.join(',') } })
        .then(({ data }) => setSuggestion(data))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(suggestionDebounce.current);
  }, [cart, venueId]);

  // Prefill from reorder
  useEffect(() => {
    const reorderItems = location.state?.reorderItems;
    if (reorderItems && items.length > 0 && cart.length === 0 && !sessionId) {
      const prefilled = reorderItems
        .map((ri) => {
          const menuItem = items.find((i) => i.id === ri.menuItemId);
          return menuItem ? { ...menuItem, quantity: ri.quantity, kind: 'menuItem', modifierSelections: [] } : null;
        })
        .filter(Boolean);
      setCart(prefilled);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const priceCeiling = useMemo(() => items.reduce((max, i) => Math.max(max, Number(i.price)), 0), [items]);

  const filteredItems = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (q && !(item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q))) return false;
      if (customizableOnly && !(item.modifierGroups && item.modifierGroups.length > 0)) return false;
      if (maxPrice > 0 && Number(item.price) > maxPrice) return false;
      return true;
    });
  }, [items, menuQuery, customizableOnly, maxPrice]);

  const itemsByCategory = useMemo(() => {
    const map = new Map();
    for (const category of categories) map.set(category.id, []);
    for (const item of filteredItems) {
      if (!map.has(item.categoryId)) map.set(item.categoryId, []);
      map.get(item.categoryId).push(item);
    }
    return map;
  }, [categories, filteredItems]);

  // Only categories that actually have items get a section (and a tab).
  const visibleCategories = useMemo(
    () => categories.filter((c) => (itemsByCategory.get(c.id) || []).length > 0),
    [categories, itemsByCategory]
  );

  // Section list that drives the sticky scroll-spy nav.
  const menuSections = useMemo(() => {
    const secs = [];
    if (combos.length > 0) secs.push({ id: 'combos', name: t('menu.specialCombos'), count: combos.length });
    for (const c of visibleCategories) {
      secs.push({ id: c.id, name: c.name, count: (itemsByCategory.get(c.id) || []).length });
    }
    return secs;
  }, [combos, visibleCategories, itemsByCategory]);

  const displayCart = sessionId
    ? (session?.items || []).map((i) => ({ ...i, price: i.unitPrice }))
    : cart;
  const subtotal = displayCart.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const pointsDiscount = redeemPoints * 1000;
  // Mirrors the server-side calculation in orders/service.js so the total
  // shown here matches what actually gets charged — happy hour needs no code,
  // it's applied automatically the same way at order creation.
  const happyHourDiscount = sessionId || !happyHour ? 0 : Math.round((subtotal * Number(happyHour.discountPercent)) / 100);
  const totalDiscount = sessionId ? 0 : happyHourDiscount + (couponPreview?.discountAmount || 0) + pointsDiscount;
  const estimatedLoyaltyPoints = Math.floor(
    (Math.max(subtotal - totalDiscount, 0) / 10000) * (venue?.loyaltyPointsRate ?? 1)
  );

  async function callWaiter() {
    if (!tableId || waiterCalling) return;
    setWaiterCalling(true);
    try {
      await api.post('/waiter-calls', { venueId, tableId });
      setWaiterCalledAt(Date.now());
      toast.success(t('menu.waiterCalledToast'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('menu.waiterCallError'));
    } finally {
      setWaiterCalling(false);
    }
  }

  async function toggleFavoriteVenue() {
    if (isFavoriteVenue) await api.delete(`/favorites/venues/${venueId}`);
    else await api.post(`/favorites/venues/${venueId}`);
    setIsFavoriteVenue(!isFavoriteVenue);
  }

  async function toggleFavoriteItem(item) {
    const isFav = favoriteItemIds.has(item.id);
    if (isFav) await api.delete(`/favorites/items/${item.id}`);
    else await api.post(`/favorites/items/${item.id}`);
    setFavoriteItemIds((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  }

  function addToCart(item, modifierSelections = [], kind = 'menuItem') {
    if (sessionId) {
      if (!myParticipantId) return;
      api.post(`/table-sessions/${sessionId}/items`, {
        participantId: myParticipantId,
        [kind === 'combo' ? 'comboId' : 'menuItemId']: item.id,
        quantity: 1,
      });
      return;
    }

    // Compute adjusted price from modifierSelections + item.modifierGroups
    const priceAdjustment = (modifierSelections || []).reduce((total, sel) => {
      const group = (item.modifierGroups || []).find((g) => g.id === sel.groupId);
      if (!group) return total;
      return total + (sel.optionIds || []).reduce((s, optId) => {
        const opt = group.options.find((o) => o.id === optId);
        return s + Number(opt?.priceAdjustment || 0);
      }, 0);
    }, 0);
    const adjustedPrice = Number(item.price) + priceAdjustment;

    const cartItem = { ...item, price: adjustedPrice, quantity: 1, kind, modifierSelections };

    setCart((prev) => {
      // If same item with identical selections, increment
      const sameKey = JSON.stringify(modifierSelections);
      const existing = prev.find(
        (i) => i.id === item.id && JSON.stringify(i.modifierSelections) === sameKey
      );
      if (existing) {
        return prev.map((i) =>
          i.id === item.id && JSON.stringify(i.modifierSelections) === sameKey
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, cartItem];
    });

    setSuggestionDismissed(false);
    suggestionDismissedRef.current = false;
  }

  function addComboToCart(combo) {
    addToCart(combo, [], 'combo');
  }

  function increment(item) {
    const sameKey = JSON.stringify(item.modifierSelections);
    setCart((prev) =>
      prev.map((i) =>
        i.id === item.id && JSON.stringify(i.modifierSelections) === sameKey
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  }

  function decrement(item) {
    const sameKey = JSON.stringify(item.modifierSelections);
    setCart((prev) =>
      prev
        .map((i) =>
          i.id === item.id && JSON.stringify(i.modifierSelections) === sameKey
            ? { ...i, quantity: i.quantity - 1 }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  function removeSessionItem(item) {
    api.delete(`/table-sessions/${sessionId}/items/${item.id}`);
  }

  function loadSavedCart() {
    if (!savedCartItems) return;
    const prefilled = savedCartItems.map((si) => {
      const menuItem = items.find((i) => i.id === si.id);
      return menuItem
        ? { ...menuItem, price: si.price, quantity: si.quantity, kind: si.kind || 'menuItem', modifierSelections: si.modifierSelections || [] }
        : null;
    }).filter(Boolean);
    setCart(prefilled);
    setSavedCartBannerDismissed(true);
    setSavedCartItems(null);
  }

  // One-tap "reorder" of the last order at this venue: fetches the canonical
  // reorder payload (menuItemId/comboId + quantity), maps it against the
  // currently loaded menu (so items removed since then are silently dropped),
  // and drops the result straight into the cart.
  async function reorderLast() {
    if (!lastOrder || sessionId) return;
    setReordering(true);
    try {
      const { data } = await api.post(`/orders/${lastOrder.id}/reorder`);
      const prefilled = data.items
        .map((ri) => {
          if (ri.comboId) {
            const combo = combos.find((c) => c.id === ri.comboId);
            return combo ? { ...combo, quantity: ri.quantity, kind: 'combo', modifierSelections: [] } : null;
          }
          const menuItem = items.find((i) => i.id === ri.menuItemId);
          return menuItem ? { ...menuItem, quantity: ri.quantity, kind: 'menuItem', modifierSelections: [] } : null;
        })
        .filter(Boolean);
      if (prefilled.length > 0) setCart(prefilled);
    } finally {
      setReordering(false);
    }
  }

  async function applyCoupon() {
    setCouponMessage('');
    setCouponPreview(null);
    try {
      const { data } = await api.post('/coupons/validate', { code: couponCode, venueId, subtotal });
      setCouponPreview(data);
    } catch (err) {
      setCouponMessage(err.response?.data?.message || t('menu.invalidCouponError'));
    }
  }

  async function startGroupOrder() {
    if (!tableId) return;
    setStartingSession(true);
    try {
      let guestName;
      if (!user || user.role !== 'CUSTOMER') {
        guestName = window.prompt(t('menu.startGroupOrderPrompt'), t('menu.guestDefaultName'));
        if (!guestName) return;
      }
      const { data } = await api.post('/table-sessions', { venueId, tableId, ...(guestName ? { guestName } : {}) });
      sessionStorage.setItem(sessionStorageKey(data.id), data.you.id);
      setMyParticipantId(data.you.id);
      setSearchParams({ table: tableId, session: data.id });
    } finally {
      setStartingSession(false);
    }
  }

  // If no tableId yet, ask the user before checkout
  function requestCheckout() {
    if (venue?.isTemporarilyClosed) {
      toast.error(venue.temporarilyClosedReason || t('menu.venueClosedError'));
      return;
    }
    if (!tableId) {
      setTableInput('');
      setTableError('');
      setShowTableModal(true);
    } else {
      handleCheckout();
    }
  }

  async function resolveTableAndCheckout() {
    const num = tableInput.trim();
    if (!num) { setTableError(t('menu.tableNumberRequired')); return; }
    setTableResolving(true);
    setTableError('');
    try {
      const { data } = await api.get(`/venues/${venueId}/tables/by-number/${encodeURIComponent(num)}`);
      setShowTableModal(false);
      // Put tableId in URL so it persists through re-renders
      setSearchParams({ table: data.tableId });
      // Checkout will be re-triggered by the user clicking the button again,
      // but we can call handleCheckout directly with the resolved id.
      await handleCheckoutWithTable(data.tableId);
    } catch (err) {
      setTableError(err.response?.status === 404 ? `${t('menu.tableNotFoundPrefix')} ${num} ${t('menu.tableNotFoundSuffix')}` : t('menu.tableCheckError'));
    } finally {
      setTableResolving(false);
    }
  }

  async function handleCheckout() {
    await handleCheckoutWithTable(tableId);
  }

  async function handlePickupCheckout() {
    setShowTableModal(false);
    await handleCheckoutWithTable(null, true);
  }

  async function handleCheckoutWithTable(resolvedTableId, isPickup = false) {
    setSubmitting(true);
    try {
      let order;
      if (sessionId) {
        const { data } = await api.post(`/table-sessions/${sessionId}/checkout`);
        order = data;
      } else {
        const { data } = await api.post('/orders', {
          venueId,
          tableId: resolvedTableId,
          isPickup,
          items: cart.map((i) =>
            i.kind === 'combo'
              ? { comboId: i.id, quantity: i.quantity }
              : { menuItemId: i.id, quantity: i.quantity, modifierSelections: i.modifierSelections || [] }
          ),
          couponCode: couponPreview ? couponCode : undefined,
          redeemPoints: redeemPoints > 0 ? redeemPoints : undefined,
          punchCardId: selectedPunchCardId || undefined,
        });
        order = data;
      }
      const { data: paymentResult } = await api.post('/payments/checkout', {
        orderId: order.id,
        walletAmount: walletAmount > 0 ? walletAmount : undefined,
        provider: selectedProvider || undefined,
      });

      if (user?.role === 'CUSTOMER') {
        api.delete(`/cart/${venueId}`).catch(() => {});
      }

      // A real gateway (as opposed to the mock/wallet-only path) hands back a
      // redirectUrl — send the browser there to actually pay; the bank sends
      // it back to /payments/aqayepardakht/callback once done.
      if (paymentResult.redirectUrl) {
        setCart([]);
        window.location.href = paymentResult.redirectUrl;
        return;
      }

      setResult(paymentResult);
      setCompletedOrder(order);
      setCart([]);
      setCouponPreview(null);
      setRedeemPoints(0);
      setSuggestion(null);
      if (selectedPunchCardId) {
        setSelectedPunchCardId(null);
        refreshPunchCards();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('menu.checkoutError'));
    } finally {
      setSubmitting(false);
    }
  }

  async function payBillShare(share) {
    try {
      const { data: payResult } = await api.post('/payments/checkout', {
        orderId: completedOrder.id,
        shareId: share.id,
      });
      setBillShares((prev) => prev.map((s) => (s.id === share.id ? { ...s, paymentStatus: payResult.payment.status === 'SUCCESS' ? 'SUCCESS' : s.paymentStatus } : s)));
      // Refresh shares
      const { data: updatedShares } = await api.get(`/orders/${completedOrder.id}/shares`);
      setBillShares(updatedShares);
    } catch (err) {
      toast.error(err.response?.data?.message || t('menu.shareError'));
    }
  }

  if (result) {
    const success = result.order.paymentStatus === 'SUCCESS';
    return (
      <Card className="max-w-md mx-auto text-center space-y-4">
        <h2 className="text-lg font-bold text-ink">
          <span className="flex items-center justify-center gap-2">
            {success ? <CheckCircle size={20} className="text-green-600" /> : <XCircle size={20} className="text-red-500" />}
            {success ? t('menu.paymentSuccess') : t('menu.paymentFailedOrPending')}
          </span>
        </h2>
        <p className="text-gray-600">{t('menu.orderNumber')} {result.order.id}</p>

        {completedOrder && !showSplitPanel && (
          <Button variant="secondary" onClick={() => setShowSplitPanel(true)}>
            {t('menu.splitBill')}
          </Button>
        )}

        {showSplitPanel && completedOrder && (
          <SplitBillPanel
            orderId={completedOrder.id}
            totalAmount={Number(completedOrder.totalAmount)}
            shares={billShares}
            onSplitCreated={(shares) => setBillShares(shares)}
            onPayShare={payBillShare}
          />
        )}

        <button className="text-primary-700 font-medium block mx-auto" onClick={() => navigate('/')}>
          {t('menu.backToHome')}
        </button>
      </Card>
    );
  }

  if (!venue || joiningSession) {
    return (
      <div className="space-y-4 py-4 animate-fade-up">
        <div className="skeleton h-8 w-52" />
        <div className="skeleton h-4 w-72" />
        <div className="grid sm:grid-cols-2 gap-3 mt-6">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
        <p className="text-center text-ink/40 text-sm pt-2">
          {joiningSession ? t('menu.joiningGroupOrder') : t('menu.loadingMenu')}
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {(venue.coverImageUrl || venue.logoUrl) && (
        <div className="relative h-36 sm:h-44 rounded-2xl overflow-hidden bg-gray-100 mb-10">
          {venue.coverImageUrl ? (
            <img src={resolveImageUrl(venue.coverImageUrl)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Coffee size={32} className="text-gray-400" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
          {venue.logoUrl && (
            <img
              src={resolveImageUrl(venue.logoUrl)}
              alt=""
              className="absolute -bottom-8 right-5 w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 object-cover shadow-lg bg-gray-100"
            />
          )}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-ink">{venue.name}</h1>
          <p className="text-sm text-ink/50 mt-1">{venue.address}</p>
          {tableId && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full mt-2">
              <CheckCircle size={12} />
              {t('menu.tableRegistered')}
            </span>
          )}
        </div>
        {user?.role === 'CUSTOMER' && (
          <button
            type="button"
            onClick={toggleFavoriteVenue}
            className={`leading-none transition-all active:scale-90 ${
              isFavoriteVenue ? 'text-red-500' : 'text-gray-300 hover:text-red-400'
            }`}
            title={t('menu.favoriteTitle')}
          >
            <Heart size={24} fill={isFavoriteVenue ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {flags.reservations && (
          <button
            type="button"
            onClick={() => setShowReservationModal(true)}
            className="inline-flex items-center gap-2 glass rounded-full pl-4 pr-3.5 py-2 text-sm font-bold text-ink/70 hover:text-ink transition-colors"
          >
            <CalendarClock size={16} className="text-accent-600" />
            {t('menu.reserveTable')}
          </button>
        )}

        {tableId && (
          <button
            type="button"
            onClick={callWaiter}
            disabled={waiterCalling || (waiterCalledAt && Date.now() - waiterCalledAt < 60000)}
            className="inline-flex items-center gap-2 glass rounded-full pl-4 pr-3.5 py-2 text-sm font-bold text-ink/70 hover:text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BellRing size={16} className="text-accent-600" />
            {waiterCalledAt && Date.now() - waiterCalledAt < 60000 ? t('menu.waiterCalledLabel') : t('menu.callWaiter')}
          </button>
        )}
      </div>

      {showReservationModal && (
        <ReservationModal venueId={venueId} onClose={() => setShowReservationModal(false)} />
      )}

      {happyHour && !venue.isTemporarilyClosed && (
        <div className="mb-4 rounded-2xl bg-gradient-to-l from-accent-500 to-accent-600 text-white px-4 py-3 flex items-center gap-3 shadow-accent-glow animate-fade-up">
          <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><Zap size={18} /></span>
          <div>
            <p className="font-extrabold text-sm">{t('menu.happyHourActive')}</p>
            <p className="text-xs text-white/85 mt-0.5">
              {Number(happyHour.discountPercent).toLocaleString('fa-IR')}٪ {t('menu.happyHourAutoDiscount')}
            </p>
          </div>
        </div>
      )}

      {!!venue.isTemporarilyClosed && (
        <Card className="mb-4 border-red-200 bg-red-50/60">
          <p className="text-sm font-bold text-red-700">{t('menu.venueClosedTitle')}</p>
          <p className="text-xs text-red-600/80 mt-1">
            {venue.temporarilyClosedReason || t('menu.venueClosedDefaultReason')}
          </p>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-bold text-ink mb-2.5 flex items-center gap-1.5">
            <Sparkles size={15} className="text-accent-600" /> {t('menu.recommendationsTitle')}
          </p>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {recommendations.map((item) => (
              <div key={item.id} className="glass rounded-2xl p-3 shrink-0 w-40">
                <p className="text-sm font-bold text-ink truncate">{item.name}</p>
                <p className="text-xs text-ink/50 mt-0.5">{Number(item.price).toLocaleString('fa-IR')} {t('menu.toman')}</p>
                <button
                  type="button"
                  onClick={() => addToCart(item)}
                  className="mt-2 w-full text-xs font-bold bg-accent-500 hover:bg-accent-600 text-white rounded-full py-1.5 transition-colors"
                >
                  + {t('menu.add')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* One-tap reorder of the last order at this venue */}
      {lastOrder && !sessionId && cart.length === 0 && (
        <Card className="mb-4 flex items-center justify-between gap-3 border-accent-200/60 bg-accent-50/40">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
              <RotateCcw size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{t('menu.reorderQuestion')}</p>
              <p className="text-xs text-ink/50 mt-0.5">{t('menu.reorderHint')}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={reorderLast} disabled={reordering} className="shrink-0">
            {reordering ? t('menu.loadingEllipsis') : t('menu.reorder')}
          </Button>
        </Card>
      )}

      {/* Saved cart resume banner */}
      {savedCartItems && !savedCartBannerDismissed && cart.length === 0 && (
        <Card className="mb-4 flex items-center justify-between gap-3 bg-primary-50 border-primary-200">
          <p className="text-sm text-gray-700">{t('menu.savedCartBanner')}</p>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="secondary" onClick={loadSavedCart}>{t('menu.load')}</Button>
            <Button variant="ghost" onClick={() => { setSavedCartBannerDismissed(true); setSavedCartItems(null); }}>{t('menu.dismiss')}</Button>
          </div>
        </Card>
      )}

      {tableId && !sessionId && flags.groupOrdering && (
        <Card className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-semibold text-ink text-sm">{t('menu.groupOrderOnTable')}</p>
            <p className="text-xs text-ink/50 mt-1">{t('menu.groupOrderHint')}</p>
          </div>
          <Button variant="secondary" onClick={startGroupOrder} disabled={startingSession}>
            {startingSession ? t('menu.creatingEllipsis') : t('menu.startGroupOrder')}
          </Button>
        </Card>
      )}

      {sessionId && session && (
        <Card className="mb-6 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="font-semibold text-ink text-sm">{t('menu.groupOrderActive')}</p>
              <p className="text-xs text-ink/50 mt-1">
                {session.participants.map((p) => p.label).join('، ')} — {t('menu.groupOrderShareHint')}
              </p>
            </div>
            <img
              src={`${FILE_BASE_URL}/api/table-sessions/${sessionId}/qrcode.png`}
              alt={t('menu.qrCodeAlt')}
              className="w-20 h-20 rounded-lg border border-gray-200"
            />
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs"
              value={window.location.href}
              onClick={(e) => e.target.select()}
            />
            <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(window.location.href)}>
              {t('menu.copyLink')}
            </Button>
          </div>
        </Card>
      )}

      {/* Search + filter over the loaded menu */}
      {priceCeiling > 0 && (
        <MenuSearchFilter
          query={menuQuery}
          onQuery={setMenuQuery}
          customizableOnly={customizableOnly}
          onCustomizableOnly={setCustomizableOnly}
          maxPrice={maxPrice || priceCeiling}
          priceCeiling={priceCeiling}
          onMaxPrice={setMaxPrice}
        />
      )}

      {/* Sticky category tab bar with scroll-spy */}
      <MenuCategoryNav sections={menuSections} />

      {menuQuery || customizableOnly || maxPrice < priceCeiling ? (
        filteredItems.length === 0 && (
          <p className="text-center text-ink/40 text-sm py-10">{t('menu.noItemsForFilters')}</p>
        )
      ) : null}

      {combos.length > 0 && (
        <section id="menu-sec-combos" className="mb-6 scroll-mt-32">
          <h2 className="flex items-center gap-2 font-extrabold text-ink mb-3">
            <span className="section-tick" style={{ height: '1.1rem' }} />
            {t('menu.specialCombos')}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {combos.map((combo) => (
              <Card key={combo.id} className="flex items-center justify-between gap-4 border-accent-200/60 bg-accent-50/40">
                <div>
                  <h4 className="font-bold text-ink">{combo.name}</h4>
                  {combo.description && <p className="text-sm text-ink/50 mt-1">{combo.description}</p>}
                  <p className="text-xs text-ink/40 mt-1">
                    {combo.items.map((i) => i.menuItemName).join('، ')}
                  </p>
                  <p className="text-accent-700 font-extrabold mt-2">{Number(combo.price).toLocaleString('fa-IR')} <span className="text-xs font-medium text-ink/40">{t('menu.toman')}</span></p>
                </div>
                <Button variant="accent" onClick={() => addComboToCart(combo)} className="shrink-0">{t('menu.add')}</Button>
              </Card>
            ))}
          </div>
        </section>
      )}

      {visibleCategories.map((category) => (
        <section key={category.id} id={`menu-sec-${category.id}`} className="mb-6 scroll-mt-32">
          <h2 className="flex items-center gap-2 font-extrabold text-ink mb-3">
            <span className="section-tick" style={{ height: '1.1rem' }} />
            {category.name}
            <span className="text-xs font-medium text-ink/35">
              {(itemsByCategory.get(category.id) || []).length.toLocaleString('fa-IR')} {t('menu.itemsCountSuffix')}
            </span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {(itemsByCategory.get(category.id) || []).map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onAdd={(it, modSels) => addToCart(it, modSels)}
                isFavorite={favoriteItemIds.has(item.id)}
                onToggleFavorite={user?.role === 'CUSTOMER' ? toggleFavoriteItem : undefined}
              />
            ))}
          </div>
        </section>
      ))}

      <CartDrawer
        cart={displayCart}
        onIncrement={increment}
        onDecrement={decrement}
        onRemove={sessionId ? removeSessionItem : undefined}
        readOnlyQuantity={Boolean(sessionId)}
        onCheckout={requestCheckout}
        submitting={submitting}
        discountAmount={totalDiscount}
        checkoutLabel={sessionId ? t('menu.checkoutGroupOrder') : undefined}
      >
        <ItemPairingSuggestion
          suggestion={suggestion}
          onAdd={(item) => addToCart(item, [])}
          onDismiss={() => { setSuggestion(null); setSuggestionDismissed(true); }}
        />

        {!sessionId && (
          <div className="space-y-3 mb-3">
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={t('menu.couponPlaceholder')}
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <Button variant="secondary" onClick={applyCoupon} disabled={!couponCode}>
                {t('menu.applyCoupon')}
              </Button>
            </div>
            {couponMessage && <p className="flex items-center gap-1 text-xs text-ink font-medium"><XCircle size={12} />{couponMessage}</p>}
            {couponPreview && (
              <p className="text-xs text-ink font-medium">
                {t('menu.couponApplied')}: {couponPreview.discountAmount.toLocaleString('fa-IR')} {t('menu.toman')} {t('menu.discountLabel')}
              </p>
            )}

            {user?.role === 'CUSTOMER' && loyaltyBalance > 0 && (
              <div>
                <label className="text-xs text-gray-600">
                  {t('menu.useLoyaltyPoints')} ({t('menu.balanceLabel')} {loyaltyBalance} {t('menu.pointsLabel')}، {t('menu.perPointValue')} {(1000).toLocaleString('fa-IR')} {t('menu.toman')})
                </label>
                <input
                  type="number"
                  min={0}
                  max={loyaltyBalance}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Math.max(0, Math.min(loyaltyBalance, Number(e.target.value))))}
                />
              </div>
            )}

            {user?.role === 'CUSTOMER' && myPunchCards.length > 0 && (
              <div>
                <label className="text-xs text-gray-600">{t('menu.usePrepaidBundle')}</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  value={selectedPunchCardId || ''}
                  onChange={(e) => setSelectedPunchCardId(e.target.value || null)}
                >
                  <option value="">{t('menu.doNotUse')}</option>
                  {myPunchCards.map((card) => (
                    <option key={card.id} value={card.id} disabled={!cart.some((i) => i.id === card.menuItemId)}>
                      {card.planName} — {card.remainingCredits} {t('menu.creditsRemaining')}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {user?.role === 'CUSTOMER' && walletBalance > 0 && (
              <div>
                <label className="text-xs text-gray-600">
                  {t('menu.payFromWallet')} ({t('menu.walletBalanceLabel')} {Number(walletBalance).toLocaleString('fa-IR')} {t('menu.toman')})
                </label>
                <input
                  type="number"
                  min={0}
                  max={Math.min(walletBalance, subtotal - totalDiscount)}
                  step={1000}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-1"
                  value={walletAmount}
                  onChange={(e) =>
                    setWalletAmount(Math.max(0, Math.min(walletBalance, subtotal - totalDiscount, Number(e.target.value))))
                  }
                />
                {walletAmount > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    {Number(walletAmount).toLocaleString('fa-IR')} {t('menu.toman')} {t('menu.fromWallet')} — {t('menu.remainingFromGateway')}: {Math.max(0, subtotal - totalDiscount - walletAmount).toLocaleString('fa-IR')} {t('menu.toman')}
                  </p>
                )}
              </div>
            )}

            {paymentMethods.length > 1 && Math.max(0, subtotal - totalDiscount - walletAmount) > 0 && (
              <div>
                <label className="text-xs text-gray-600">{t('menu.paymentMethod')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {paymentMethods.map((m) => (
                    <button
                      key={m.name}
                      type="button"
                      onClick={() => setSelectedProvider(m.name)}
                      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs border font-bold ${
                        selectedProvider === m.name
                          ? 'border-primary-800 bg-primary-800 text-white'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      {GATEWAY_LOGOS[m.name] && (
                        <img
                          src={GATEWAY_LOGOS[m.name]}
                          alt=""
                          className={`h-5 object-contain ${selectedProvider === m.name ? 'brightness-0 invert' : ''}`}
                        />
                      )}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {user?.role === 'CUSTOMER' && estimatedLoyaltyPoints > 0 && (
              <p className="flex items-center gap-1.5 text-xs font-bold text-accent-800 bg-accent-50 border border-accent-200/70 rounded-xl px-3 py-2">
                <Gift size={13} />
                {t('menu.earnPointsPrefix')} {estimatedLoyaltyPoints.toLocaleString('fa-IR')} {t('menu.earnPointsSuffix')}
              </p>
            )}
          </div>
        )}
      </CartDrawer>

      {/* Prepaid bundles ("punch cards") the venue owner has set up */}
      {punchCardPlans.length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-ink mb-3">{t('menu.prepaidBundlesTitle')}</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {punchCardPlans.map((plan) => (
              <Card key={plan.id} className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-primary-700">{plan.name}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.menuItemName} — {plan.totalCredits} {t('menu.unitsWord')} {t('menu.forPriceWord')} {Number(plan.price).toLocaleString('fa-IR')} {t('menu.toman')}
                  </p>
                </div>
                {user?.role === 'CUSTOMER' && (
                  <Button onClick={() => buyPunchCard(plan.id)}>{t('menu.buy')}</Button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Customer reviews — social proof right under the menu */}
      <ReviewsSection venueId={venueId} />

      {/* Table number entry modal — shown when customer arrives without scanning QR */}
      {showTableModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowTableModal(false); }}
        >
          <div className="glass-strong rounded-3xl shadow-lift w-full max-w-xs p-6 space-y-4 animate-pop-in" dir="rtl">
            <h3 className="font-black text-ink text-lg">{t('menu.tableNumberModalTitle')}</h3>
            <p className="text-sm text-ink/50">{t('menu.tableNumberModalHint')}</p>
            <input
              type="text"
              inputMode="numeric"
              className="glass-input w-full rounded-xl px-4 py-3 text-center text-xl font-black"
              placeholder={t('menu.tableNumberPlaceholder')}
              value={tableInput}
              onChange={(e) => { setTableInput(e.target.value); setTableError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') resolveTableAndCheckout(); }}
              autoFocus
            />
            {tableError && (
              <p className="flex items-center justify-center gap-1.5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 animate-pop-in">
                {tableError}
              </p>
            )}
            <button
              className="w-full bg-gradient-to-b from-primary-700 to-primary-900 shadow-button hover:shadow-[0_10px_30px_rgba(20,18,16,0.32)] disabled:opacity-50 text-white font-bold rounded-full py-3 transition-all active:scale-95"
              onClick={resolveTableAndCheckout}
              disabled={tableResolving || !tableInput.trim()}
            >
              {tableResolving ? t('menu.checkingEllipsis') : t('menu.confirmAndPlaceOrder')}
            </button>

            {!!venue.acceptsPickup && (
              <>
                <div className="flex items-center gap-3">
                  <span className="flex-1 h-px bg-black/10" />
                  <span className="text-[11px] text-ink/40">{t('menu.or')}</span>
                  <span className="flex-1 h-px bg-black/10" />
                </div>
                <button
                  type="button"
                  onClick={handlePickupCheckout}
                  disabled={submitting}
                  className="w-full glass rounded-full py-3 text-sm font-bold text-ink/70 hover:text-ink transition-all active:scale-95"
                >
                  {t('menu.noTablePickup')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
