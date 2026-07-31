import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, EmptyState, Icon, Input, Loading, Muted, Row, T } from '../../components/UI';
import api, { imageUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const EMPTY_ITEM = { name: '', price: '', categoryId: '', description: '', tags: '' };

export default function VenueMenuManagementScreen() {
  const { user } = useAuth();
  const { t, money } = useI18n();
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [addingItem, setAddingItem] = useState(false);
  const [uploadingItemId, setUploadingItemId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkPriceMultiplier, setBulkPriceMultiplier] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ data: cats }, { data: menuItems }] = await Promise.all([
        api.get(`/menu/${user.venueId}/categories`),
        api.get(`/menu/${user.venueId}/items/all`),
      ]);
      setCategories(cats);
      setItems(menuItems);
      if (!newItem.categoryId && cats.length > 0) {
        setNewItem((f) => ({ ...f, categoryId: String(cats[0].id) }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.venueId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function addCategory() {
    if (!newCategory.trim()) return;
    try {
      await api.post(`/menu/${user.venueId}/categories`, { name: newCategory.trim() });
      setNewCategory('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function toggleCategoryHidden(category) {
    try {
      await api.patch(`/menu/${user.venueId}/categories/${category.id}`, { isHidden: !category.isHidden });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function addItem() {
    if (!newItem.name || !newItem.price || !newItem.categoryId) {
      toast.error(t('menuItemRequiredFields'));
      return;
    }
    setAddingItem(true);
    try {
      await api.post(`/menu/${user.venueId}/items`, { ...newItem, price: Number(newItem.price) });
      setNewItem({ ...EMPTY_ITEM, categoryId: newItem.categoryId });
      toast.success(t('menuItemAdded'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setAddingItem(false);
    }
  }

  async function toggleAvailability(item) {
    try {
      await api.patch(`/menu/${user.venueId}/items/${item.id}`, { isAvailable: !item.isAvailable });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  function confirmRemoveItem(item) {
    Alert.alert(t('deleteMenuItemTitle'), t('deleteMenuItemConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/menu/${user.venueId}/items/${item.id}`);
            load();
          } catch (err) {
            toast.error(err.response?.data?.message || t('orderFailed'));
          }
        },
      },
    ]);
  }

  async function pickAndUploadItemImage(item) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploadingItemId(item.id);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'item.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      await api.post(`/menu/${user.venueId}/items/${item.id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(t('menuItemImageUpdated'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setUploadingItemId(null);
    }
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
    try {
      await api.patch(`/menu/${user.venueId}/items/bulk`, { ids: [...selectedIds], isAvailable });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function bulkPrice() {
    if (selectedIds.size === 0 || !bulkPriceMultiplier) return;
    try {
      await api.patch(`/menu/${user.venueId}/items/bulk`, {
        ids: [...selectedIds],
        priceMultiplier: Number(bulkPriceMultiplier),
      });
      setBulkPriceMultiplier('');
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function pickAndImportCsv() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.name || 'menu-import.csv',
        type: asset.mimeType || 'text/csv',
      });
      const { data } = await api.post(`/menu/${user.venueId}/items/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.created > 0) toast.success(t('csvImportCreated', { n: data.created }));
      if (data.errors?.length > 0) toast.error(t('csvImportErrors', { n: data.errors.length }));
      if (data.created === 0 && (!data.errors || data.errors.length === 0)) toast.info(t('csvImportEmpty'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 14 }}>{t('menuManagement')}</T>

      <Card style={{ marginBottom: 14 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 6 }}>{t('csvImportTitle')}</T>
        <Muted style={{ fontSize: 12, marginBottom: 10 }}>{t('csvImportHint')}</Muted>
        <Button
          small
          variant="ghost"
          icon="upload"
          title={importing ? t('loading') : t('csvImportButton')}
          onPress={pickAndImportCsv}
          disabled={importing}
        />
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('addCategory')}</T>
        <Row style={{ gap: 8, marginBottom: 10 }}>
          <Input style={{ flex: 1 }} placeholder={t('categoryName')} value={newCategory} onChangeText={setNewCategory} />
          <Button small title={t('add')} onPress={addCategory} />
        </Row>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.isHidden ? `${c.name} (${t('hidden')})` : c.name}
              active={!c.isHidden}
              onPress={() => toggleCategoryHidden(c)}
            />
          ))}
        </Row>
      </Card>

      <Card style={{ marginBottom: 14, gap: 10 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{t('addMenuItem')}</T>
        <Input placeholder={t('itemName')} value={newItem.name} onChangeText={(v) => setNewItem((f) => ({ ...f, name: v }))} />
        <Input
          placeholder={t('itemPrice')}
          keyboardType="numeric"
          value={newItem.price}
          onChangeText={(v) => setNewItem((f) => ({ ...f, price: v }))}
        />
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              active={String(newItem.categoryId) === String(c.id)}
              onPress={() => setNewItem((f) => ({ ...f, categoryId: String(c.id) }))}
            />
          ))}
        </Row>
        <Input
          placeholder={t('itemDescriptionOptional')}
          value={newItem.description}
          onChangeText={(v) => setNewItem((f) => ({ ...f, description: v }))}
        />
        <Input
          placeholder={t('itemTagsPlaceholder')}
          value={newItem.tags}
          onChangeText={(v) => setNewItem((f) => ({ ...f, tags: v }))}
        />
        <Button title={addingItem ? t('loading') : t('addMenuItem')} onPress={addItem} disabled={addingItem} />
      </Card>

      {selectedIds.size > 0 && (
        <Card style={{ marginBottom: 14, backgroundColor: colors.surfaceHigh }}>
          <T style={{ fontSize: 13, marginBottom: 8 }}>{t('itemsSelected', { n: selectedIds.size })}</T>
          <Row style={{ gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <Button small variant="ghost" title={t('bulkEnable')} onPress={() => bulkEnable(true)} />
            <Button small variant="ghost" title={t('bulkDisable')} onPress={() => bulkEnable(false)} />
          </Row>
          <Row style={{ gap: 8 }}>
            <Input
              style={{ flex: 1 }}
              placeholder={t('bulkPriceMultiplierPlaceholder')}
              keyboardType="decimal-pad"
              value={bulkPriceMultiplier}
              onChangeText={setBulkPriceMultiplier}
            />
            <Button small title={t('apply')} onPress={bulkPrice} />
          </Row>
        </Card>
      )}

      <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('menuItems')}</T>
      {items.length === 0 ? (
        <EmptyState icon="coffee" title={t('noMenuItemsYet')} />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={{ marginBottom: 10 }}>
            <Row style={{ gap: 12 }}>
              <Pressable
                onPress={() => toggleSelected(item.id)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: selectedIds.has(item.id) ? colors.gold300 : colors.surfaceHigh,
                  backgroundColor: selectedIds.has(item.id) ? colors.gold300 : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {selectedIds.has(item.id) && <Icon name="check" size={14} color={colors.charcoal} />}
              </Pressable>
              <Pressable
                onPress={() => pickAndUploadItemImage(item)}
                disabled={uploadingItemId === item.id}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceHigh,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: imageUrl(item.imageUrl) }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Icon name="image" size={18} color={colors.gold300} />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: fonts.medium, fontSize: 15 }} numberOfLines={1}>
                  {item.name}
                </T>
                <Muted style={{ fontSize: 13, marginTop: 2 }}>{money(item.price)}</Muted>
                {item.tags ? <Muted style={{ fontSize: 11, marginTop: 2 }}>{item.tags}</Muted> : null}
              </View>
            </Row>
            <Row style={{ gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
              <Button
                small
                variant="ghost"
                title={uploadingItemId === item.id ? t('loading') : item.imageUrl ? t('changePhoto') : t('addPhoto')}
                onPress={() => pickAndUploadItemImage(item)}
                disabled={uploadingItemId === item.id}
              />
              <Button
                small
                variant="ghost"
                title={item.isAvailable ? t('disableItem') : t('enableItem')}
                onPress={() => toggleAvailability(item)}
              />
              <Button small variant="danger" title={t('delete')} onPress={() => confirmRemoveItem(item)} />
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
