import { useCallback, useState } from 'react';
import { Alert, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, EmptyState, Input, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const EMPTY_FORM = { name: '', description: '', price: '', selectedItemIds: [] };

export default function VenueCombosScreen() {
  const { user } = useAuth();
  const { t, money } = useI18n();
  const toast = useToast();
  const [combos, setCombos] = useState([]);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [{ data: comboList }, { data: menuItems }] = await Promise.all([
        api.get(`/menu/${user.venueId}/combos/all`),
        api.get(`/menu/${user.venueId}/items/all`),
      ]);
      setCombos(comboList);
      setItems(menuItems);
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

  function toggleItem(itemId) {
    setForm((prev) => ({
      ...prev,
      selectedItemIds: prev.selectedItemIds.includes(itemId)
        ? prev.selectedItemIds.filter((id) => id !== itemId)
        : [...prev.selectedItemIds, itemId],
    }));
  }

  async function createCombo() {
    if (!form.name || !form.price || form.selectedItemIds.length === 0) {
      toast.error(t('comboRequiredFields'));
      return;
    }
    setCreating(true);
    try {
      await api.post(`/menu/${user.venueId}/combos`, {
        name: form.name,
        description: form.description,
        price: Number(form.price),
        items: form.selectedItemIds.map((menuItemId) => ({ menuItemId, quantity: 1 })),
      });
      setForm(EMPTY_FORM);
      toast.success(t('comboCreated'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(combo) {
    try {
      await api.patch(`/menu/${user.venueId}/combos/${combo.id}`, { isActive: !combo.isActive });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  function confirmRemove(combo) {
    Alert.alert(t('deleteComboTitle'), t('deleteComboConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/menu/${user.venueId}/combos/${combo.id}`);
            load();
          } catch (err) {
            toast.error(err.response?.data?.message || t('orderFailed'));
          }
        },
      },
    ]);
  }

  if (loading) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 14 }}>{t('comboManagement')}</T>

      <Card style={{ marginBottom: 14, gap: 10 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{t('createCombo')}</T>
        <Input placeholder={t('comboName')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Input
          placeholder={t('comboPrice')}
          keyboardType="numeric"
          value={form.price}
          onChangeText={(v) => setForm((f) => ({ ...f, price: v }))}
        />
        <Input
          placeholder={t('itemDescriptionOptional')}
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
        />
        <Muted style={{ fontSize: 12 }}>{t('comboSelectItems')}</Muted>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {items.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              active={form.selectedItemIds.includes(item.id)}
              onPress={() => toggleItem(item.id)}
            />
          ))}
        </Row>
        <Button title={creating ? t('loading') : t('createCombo')} onPress={createCombo} disabled={creating} />
      </Card>

      <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('combos')}</T>
      {combos.length === 0 ? (
        <EmptyState icon="package" title={t('noCombosYet')} />
      ) : (
        combos.map((combo) => (
          <Card key={combo.id} style={{ marginBottom: 10 }}>
            <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{combo.name}</T>
            {combo.description ? <Muted style={{ fontSize: 12, marginTop: 2 }}>{combo.description}</Muted> : null}
            <T style={{ fontFamily: fonts.bold, fontSize: 14, marginTop: 6, color: colors.gold300 }}>{money(combo.price)}</T>
            {(combo.items || []).map((item) => (
              <Muted key={item.id} style={{ fontSize: 11, marginTop: 2 }}>
                {item.menuItemName} — {t('quantityX', { n: item.quantity })}
              </Muted>
            ))}
            <Row style={{ gap: 8, marginTop: 10 }}>
              <Button
                small
                variant="ghost"
                title={combo.isActive ? t('disableItem') : t('enableItem')}
                onPress={() => toggleActive(combo)}
              />
              <Button small variant="danger" title={t('delete')} onPress={() => confirmRemove(combo)} />
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
