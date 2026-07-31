import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { SkeletonRows } from '../../components/SkeletonBlock';

export default function ContentCenter() {
  const { t, n } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();
  const [venues, setVenues] = useState(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [pricePercent, setPricePercent] = useState('');
  const [itemNameContains, setItemNameContains] = useState('');
  const [itemAvailable, setItemAvailable] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/admin/venues').then(({ data }) => setVenues(data));
  }, []);

  const filtered = (venues || []).filter((v) => v.name.includes(search) || v.city?.includes(search));
  const selectedIds = [...selected];

  function toggleVenue(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (filtered.every((v) => selected.has(v.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelected((prev) => new Set([...prev, ...filtered.map((v) => v.id)]));
    }
  }

  async function requireSelection() {
    if (selectedIds.length === 0) {
      toast.error(t('admin.contentCenter.selectAtLeastOne'));
      return false;
    }
    return confirm(`${t('admin.contentCenter.bulkActionConfirmPrefix')} ${n(selectedIds.length)} ${t('admin.contentCenter.bulkActionConfirmSuffix')}`, {
      title: t('admin.contentCenter.bulkEditConfirmTitle'),
    });
  }

  async function runFindReplace() {
    if (!findText) return toast.error(t('admin.contentCenter.enterSearchText'));
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/venues/description', {
        venueIds: selectedIds,
        find: findText,
        replace: replaceText,
      });
      toast.success(`${t('admin.contentCenter.descriptionsUpdatedPrefix')} ${n(data.affected)} ${t('admin.contentCenter.descriptionsUpdatedMiddle')} ${n(data.matched)} ${t('admin.contentCenter.descriptionsUpdatedSuffix')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.contentCenter.bulkEditFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function runStatusChange(field, value) {
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/venues/status', {
        venueIds: selectedIds,
        [field]: value,
      });
      toast.success(`${t('admin.contentCenter.statusUpdatedPrefix')} ${n(data.affected)} ${t('admin.contentCenter.statusUpdatedSuffix')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.contentCenter.updateFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function runPriceAdjust() {
    if (pricePercent === '' || Number.isNaN(Number(pricePercent))) return toast.error(t('admin.contentCenter.enterValidPercent'));
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/menu/prices', {
        venueIds: selectedIds,
        percent: Number(pricePercent),
      });
      toast.success(`${t('admin.contentCenter.priceAdjustedPrefix')} ${n(data.affected)} ${t('admin.contentCenter.priceAdjustedSuffix')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.contentCenter.priceAdjustFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function runAvailability() {
    if (!itemNameContains) return toast.error(t('admin.contentCenter.enterItemName'));
    if (!(await requireSelection())) return;
    setBusy(true);
    try {
      const { data } = await api.patch('/admin/content-center/menu/availability', {
        venueIds: selectedIds,
        itemNameContains,
        isAvailable: itemAvailable,
      });
      toast.success(`${t('admin.contentCenter.availabilityChangedPrefix')} ${n(data.affected)} ${t('admin.contentCenter.availabilityChangedSuffix')}`);
    } catch (err) {
      toast.error(err.response?.data?.message || t('admin.contentCenter.updateFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-bold text-ink text-lg">{t('admin.contentCenter.title')}</h2>
        <p className="text-sm text-ink/50 mt-1">{t('admin.contentCenter.subtitle')}</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-ink">{t('admin.contentCenter.selectVenuesTitle')}</h3>
          <span className="text-xs text-ink/50">{n(selectedIds.length)} {t('admin.contentCenter.itemsSelected')}</span>
        </div>
        <input
          className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full mb-3"
          placeholder={t('admin.contentCenter.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {!venues ? (
          <SkeletonRows rows={5} />
        ) : (
          <>
            <button type="button" onClick={toggleAll} className="text-xs text-primary-700 hover:underline mb-2">
              {filtered.every((v) => selected.has(v.id)) && filtered.length > 0 ? t('admin.contentCenter.deselectAll') : t('admin.contentCenter.selectAllFiltered')}
            </button>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {filtered.map((v) => (
                <label key={v.id} className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg hover:bg-ink/5 cursor-pointer">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggleVenue(v.id)} />
                  <span className="text-ink">{v.name}</span>
                  <span className="text-ink/40 text-xs">{v.city}</span>
                </label>
              ))}
              {filtered.length === 0 && <p className="text-ink/40 text-sm py-2">{t('admin.contentCenter.noResults')}</p>}
            </div>
          </>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card>
          <h3 className="font-semibold text-ink mb-3">{t('admin.contentCenter.findReplaceTitle')}</h3>
          <div className="space-y-2">
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder={t('admin.contentCenter.searchTextPlaceholder')}
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
            />
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder={t('admin.contentCenter.replaceTextPlaceholder')}
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
            <Button onClick={runFindReplace} disabled={busy}>
              {t('admin.contentCenter.applyToSelected')}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">{t('admin.contentCenter.bulkStatusChangeTitle')}</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => runStatusChange('isTemporarilyClosed', true)} disabled={busy}>
              {t('admin.contentCenter.tempClosureOn')}
            </Button>
            <Button variant="ghost" onClick={() => runStatusChange('isTemporarilyClosed', false)} disabled={busy}>
              {t('admin.contentCenter.tempClosureOff')}
            </Button>
            <Button variant="secondary" onClick={() => runStatusChange('acceptsPickup', true)} disabled={busy}>
              {t('admin.contentCenter.pickupOn')}
            </Button>
            <Button variant="ghost" onClick={() => runStatusChange('acceptsPickup', false)} disabled={busy}>
              {t('admin.contentCenter.pickupOff')}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">{t('admin.contentCenter.bulkPriceAdjustTitle')}</h3>
          <div className="space-y-2">
            <input
              type="number"
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder={t('admin.contentCenter.percentChangePlaceholder')}
              value={pricePercent}
              onChange={(e) => setPricePercent(e.target.value)}
            />
            <Button onClick={runPriceAdjust} disabled={busy}>
              {t('admin.contentCenter.applyToAllMenuItems')}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-ink mb-3">{t('admin.contentCenter.bulkAvailabilityTitle')}</h3>
          <div className="space-y-2">
            <input
              className="border border-ink/10 bg-transparent rounded-lg px-3 py-2 text-sm w-full"
              placeholder={t('admin.contentCenter.itemNamePlaceholder')}
              value={itemNameContains}
              onChange={(e) => setItemNameContains(e.target.value)}
            />
            <div className="flex items-center gap-3 text-sm text-ink/70">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={itemAvailable} onChange={() => setItemAvailable(true)} /> {t('admin.contentCenter.available')}
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={!itemAvailable} onChange={() => setItemAvailable(false)} /> {t('admin.contentCenter.unavailable')}
              </label>
            </div>
            <Button onClick={runAvailability} disabled={busy}>
              {t('admin.contentCenter.applyToSelected')}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
