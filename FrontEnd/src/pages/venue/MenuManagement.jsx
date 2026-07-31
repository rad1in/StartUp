import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Circle, ImagePlus, Upload } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { resolveImageUrl } from '../../components/VenueCards';

const IMPORT_TEMPLATE = 'category,name,description,price,isAvailable\nنوشیدنی گرم,اسپرسو,یک شات اسپرسو تازه,60000,true\n';

export default function MenuManagement() {
  const { t, n } = useLanguage();
  const { user } = useAuth();
  const venueId = user?.venueId;
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState({
    name: '',
    price: '',
    categoryId: '',
    description: '',
    tags: '',
    scheduleStart: '',
    scheduleEnd: '',
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPriceMultiplier, setBulkPriceMultiplier] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [uploadingImageId, setUploadingImageId] = useState(null);
  const itemImageInputRef = useRef(null);
  const [imageTargetItemId, setImageTargetItemId] = useState(null);

  async function refresh() {
    const [{ data: cats }, { data: menuItems }] = await Promise.all([
      api.get(`/menu/${venueId}/categories`),
      api.get(`/menu/${venueId}/items/all`),
    ]);
    setCategories(cats);
    setItems(menuItems);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function addCategory(e) {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await api.post(`/menu/${venueId}/categories`, { name: newCategory });
    setNewCategory('');
    refresh();
  }

  async function toggleCategoryHidden(category) {
    await api.patch(`/menu/${venueId}/categories/${category.id}`, { isHidden: !category.isHidden });
    refresh();
  }

  async function addItem(e) {
    e.preventDefault();
    if (!newItem.name || !newItem.price || !newItem.categoryId) return;
    await api.post(`/menu/${venueId}/items`, {
      ...newItem,
      price: Number(newItem.price),
      scheduleStart: newItem.scheduleStart || null,
      scheduleEnd: newItem.scheduleEnd || null,
    });
    setNewItem({ name: '', price: '', categoryId: '', description: '', tags: '', scheduleStart: '', scheduleEnd: '' });
    refresh();
  }

  async function toggleAvailability(item) {
    await api.patch(`/menu/${venueId}/items/${item.id}`, { isAvailable: !item.isAvailable });
    refresh();
  }

  async function removeItem(item) {
    await api.delete(`/menu/${venueId}/items/${item.id}`);
    refresh();
  }

  function toggleSelected(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkEnable(isAvailable) {
    if (selectedIds.size === 0) return;
    await api.patch(`/menu/${venueId}/items/bulk`, { ids: [...selectedIds], isAvailable });
    setSelectedIds(new Set());
    refresh();
  }

  async function bulkPrice() {
    if (selectedIds.size === 0 || !bulkPriceMultiplier) return;
    await api.patch(`/menu/${venueId}/items/bulk`, {
      ids: [...selectedIds],
      priceMultiplier: Number(bulkPriceMultiplier),
    });
    setBulkPriceMultiplier('');
    setSelectedIds(new Set());
    refresh();
  }

  function openImagePicker(item) {
    setImageTargetItemId(item.id);
    itemImageInputRef.current?.click();
  }

  async function handleItemImageChange(e) {
    const file = e.target.files?.[0];
    const itemId = imageTargetItemId;
    if (!file || !itemId) return;
    setUploadingImageId(itemId);
    try {
      const formData = new FormData();
      formData.append('image', file);
      await api.post(`/menu/${venueId}/items/${itemId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('venue.menuManagement.itemImageUpdated'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('venue.menuManagement.imageUploadFailed'));
    } finally {
      setUploadingImageId(null);
      setImageTargetItemId(null);
      if (itemImageInputRef.current) itemImageInputRef.current.value = '';
    }
  }

  function toggleVariants(item) {
    setExpandedItemId((prev) => (prev === item.id ? null : item.id));
  }

  function downloadTemplate() {
    const blob = new Blob([IMPORT_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'menu-import-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  async function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/menu/${venueId}/items/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.created > 0) toast.success(`${n(data.created)} ${t('venue.menuManagement.itemsAddedSuccess')}`);
      if (data.errors.length > 0) {
        toast.error(`${n(data.errors.length)} ${t('venue.menuManagement.rowsFailedPrefix')}: ${data.errors.slice(0, 3).join(' | ')}`, 8000);
      }
      if (data.created === 0 && data.errors.length === 0) toast.info(t('venue.menuManagement.noValidRowsFound'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('venue.menuManagement.bulkImportFailed'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!venueId) return <p className="text-gray-500">{t('common.noVenueLinked')}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <Link to="/venue/combos">
          <Button variant="secondary">{t('venue.menuManagement.manageCombos')}</Button>
        </Link>
      </div>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.menuManagement.bulkImportTitle')}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('venue.menuManagement.bulkImportDesc')}
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            <Upload size={15} className="inline ml-1" />
            {importing ? t('venue.menuManagement.importing') : t('venue.menuManagement.selectAndUploadCsv')}
          </Button>
          <button type="button" onClick={downloadTemplate} className="text-xs text-primary-700 hover:underline">
            {t('venue.menuManagement.downloadSampleFile')}
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.menuManagement.addNewCategory')}</h3>
        <form onSubmit={addCategory} className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.menuManagement.categoryNamePlaceholder')}
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button type="submit">{t('common.add')}</Button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className={`text-xs px-2 py-1 rounded-full cursor-pointer ${
                c.isHidden ? 'bg-gray-200 text-gray-500' : 'bg-primary-100 text-primary-700'
              }`}
              onClick={() => toggleCategoryHidden(c)}
              title={t('venue.menuManagement.clickToShowHide')}
            >
              {c.name} {c.isHidden ? `(${t('venue.menuManagement.hidden')})` : ''}
            </span>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.menuManagement.addMenuItem')}</h3>
        <form onSubmit={addItem} className="grid sm:grid-cols-2 gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.menuManagement.itemNamePlaceholder')}
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.menuManagement.pricePlaceholder')}
            type="number"
            value={newItem.price}
            onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2"
            value={newItem.categoryId}
            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
          >
            <option value="">{t('venue.menuManagement.selectCategory')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.menuManagement.descriptionOptional')}
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.menuManagement.tagsPlaceholder')}
            value={newItem.tags}
            onChange={(e) => setNewItem({ ...newItem, tags: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">{t('venue.menuManagement.displayStartTime')}</label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={newItem.scheduleStart}
                onChange={(e) => setNewItem({ ...newItem, scheduleStart: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">{t('venue.menuManagement.displayEndTime')}</label>
              <input
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                value={newItem.scheduleEnd}
                onChange={(e) => setNewItem({ ...newItem, scheduleEnd: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" className="sm:col-span-2">
            {t('venue.menuManagement.addItem')}
          </Button>
        </form>
      </Card>

      {selectedIds.size > 0 && (
        <Card className="bg-primary-50 border-primary-200">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-700">{selectedIds.size} {t('venue.menuManagement.itemsSelected')}</span>
            <Button variant="secondary" onClick={() => bulkEnable(true)}>
              {t('venue.menuManagement.bulkEnable')}
            </Button>
            <Button variant="secondary" onClick={() => bulkEnable(false)}>
              {t('venue.menuManagement.bulkDisable')}
            </Button>
            <input
              type="number"
              step="0.01"
              className="w-28 border border-gray-300 rounded-lg px-2 py-1 text-sm"
              placeholder={t('venue.menuManagement.priceMultiplierPlaceholder')}
              value={bulkPriceMultiplier}
              onChange={(e) => setBulkPriceMultiplier(e.target.value)}
            />
            <Button variant="secondary" onClick={bulkPrice}>
              {t('venue.menuManagement.applyBulkPriceChange')}
            </Button>
          </div>
        </Card>
      )}

      <input
        ref={itemImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleItemImageChange}
      />

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.menuManagement.menuItems')}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelected(item.id)} />
                <button
                  type="button"
                  onClick={() => openImagePicker(item)}
                  disabled={uploadingImageId === item.id}
                  className="shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center"
                  title={t('venue.menuManagement.uploadChangeItemImage')}
                >
                  {item.imageUrl ? (
                    <img src={resolveImageUrl(item.imageUrl)} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImagePlus size={18} className="text-gray-400" />
                  )}
                </button>
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{item.name}</p>
                  <p className="text-sm text-gray-500">{n(Number(item.price))} {t('common.toman')}</p>
                  {item.tags && <p className="text-xs text-gray-400 mt-1">{t('venue.menuManagement.tagsLabel')}: {item.tags}</p>}
                  {(item.scheduleStart || item.scheduleEnd) && (
                    <p className="text-xs text-gray-400">
                      {t('venue.menuManagement.displayLabel')}: {item.scheduleStart || '—'} {t('venue.accounting.dateRangeTo')} {item.scheduleEnd || '—'}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <Button
                  variant="secondary"
                  onClick={() => openImagePicker(item)}
                  disabled={uploadingImageId === item.id}
                >
                  {uploadingImageId === item.id ? t('venue.menuManagement.uploading') : item.imageUrl ? t('venue.menuManagement.changeImage') : t('venue.menuManagement.addImage')}
                </Button>
                <Button variant="secondary" onClick={() => toggleAvailability(item)}>
                  {item.isAvailable ? t('venue.marketing.deactivate') : t('venue.marketing.activate')}
                </Button>
                <Button variant="ghost" onClick={() => toggleVariants(item)}>
                  {t('venue.menuManagement.variants')}
                </Button>
                <Button variant="danger" onClick={() => removeItem(item)}>
                  {t('common.delete')}
                </Button>
              </div>

              {expandedItemId === item.id && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {t('venue.menuManagement.modifierGroupsInfoPrefix')}{' '}
                    <Link to="/venue/modifier-groups" className="text-primary-700 underline">{t('venue.menuManagement.modifierGroupsInfoLink')}</Link>{' '}
                    {t('venue.menuManagement.modifierGroupsInfoSuffix')}
                  </p>
                  {(item.modifierGroups || []).length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-500">
                      {item.modifierGroups.map((g) => (
                        <li key={g.id} className="flex items-center gap-1"><Circle size={6} fill="currentColor" />{g.name} ({g.options?.length || 0} {t('venue.menuManagement.optionsCount')})</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
