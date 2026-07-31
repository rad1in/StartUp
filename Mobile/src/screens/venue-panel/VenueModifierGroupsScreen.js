import { useCallback, useState } from 'react';
import { Alert, ScrollView, Switch, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, EmptyState, Input, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const TYPES = ['SINGLE_SELECT', 'MULTI_SELECT', 'TOGGLE_REMOVE'];
const EMPTY_GROUP = { name: '', type: 'SINGLE_SELECT', isRequired: false, minSelections: '0', maxSelections: '' };

export default function VenueModifierGroupsScreen() {
  const { user } = useAuth();
  const { t, money, n } = useI18n();
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [newGroup, setNewGroup] = useState(EMPTY_GROUP);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState(null);

  const load = useCallback(async () => {
    try {
      const [{ data: g }, { data: mi }] = await Promise.all([
        api.get(`/menu/${user.venueId}/modifier-groups`),
        api.get(`/menu/${user.venueId}/items/all`),
      ]);
      setGroups(g);
      setMenuItems(mi);
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

  async function createGroup() {
    if (!newGroup.name.trim()) return;
    setCreating(true);
    try {
      await api.post(`/menu/${user.venueId}/modifier-groups`, {
        ...newGroup,
        minSelections: Number(newGroup.minSelections) || 0,
        maxSelections: newGroup.maxSelections !== '' ? Number(newGroup.maxSelections) : null,
      });
      setNewGroup(EMPTY_GROUP);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setCreating(false);
    }
  }

  function confirmDeleteGroup(groupId) {
    Alert.alert(t('deleteModifierGroupTitle'), t('deleteModifierGroupConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/menu/${user.venueId}/modifier-groups/${groupId}`);
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
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 14 }}>{t('modifierGroupManagement')}</T>

      <Card style={{ marginBottom: 14, gap: 10 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{t('addModifierGroup')}</T>
        <Input
          placeholder={t('modifierGroupNamePlaceholder')}
          value={newGroup.name}
          onChangeText={(v) => setNewGroup((f) => ({ ...f, name: v }))}
        />
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map((type) => (
            <Chip
              key={type}
              label={t(`modifierType_${type}`)}
              active={newGroup.type === type}
              onPress={() => setNewGroup((f) => ({ ...f, type }))}
            />
          ))}
        </Row>
        <Row style={{ gap: 8 }}>
          <Input
            style={{ flex: 1 }}
            placeholder={t('minSelections')}
            keyboardType="numeric"
            value={String(newGroup.minSelections)}
            onChangeText={(v) => setNewGroup((f) => ({ ...f, minSelections: v }))}
          />
          <Input
            style={{ flex: 1 }}
            placeholder={t('maxSelectionsUnlimited')}
            keyboardType="numeric"
            value={String(newGroup.maxSelections)}
            onChangeText={(v) => setNewGroup((f) => ({ ...f, maxSelections: v }))}
          />
        </Row>
        <Row between>
          <T style={{ fontSize: 13 }}>{t('required')}</T>
          <Switch
            value={newGroup.isRequired}
            onValueChange={(v) => setNewGroup((f) => ({ ...f, isRequired: v }))}
            trackColor={{ false: colors.surfaceHigh, true: colors.gold300 }}
          />
        </Row>
        <Button title={creating ? t('loading') : t('addModifierGroup')} onPress={createGroup} disabled={creating} />
      </Card>

      {groups.length === 0 ? (
        <EmptyState icon="sliders" title={t('noModifierGroupsYet')} />
      ) : (
        groups.map((group) => (
          <ModifierGroupCard
            key={group.id}
            group={group}
            venueId={user.venueId}
            menuItems={menuItems}
            expanded={expandedGroupId === group.id}
            onToggle={() => setExpandedGroupId(expandedGroupId === group.id ? null : group.id)}
            onDelete={() => confirmDeleteGroup(group.id)}
            onRefresh={load}
            t={t}
            money={money}
            n={n}
            toast={toast}
          />
        ))
      )}
    </ScrollView>
  );
}

function ModifierGroupCard({ group, venueId, menuItems, expanded, onToggle, onDelete, onRefresh, t, money, n, toast }) {
  const [newOption, setNewOption] = useState({ name: '', priceAdjustment: '', isDefault: false });
  const [attachedItemIds, setAttachedItemIds] = useState(null);
  const [addingOption, setAddingOption] = useState(false);

  async function loadAttachments() {
    try {
      const results = await Promise.all(
        menuItems.map((item) =>
          api.get(`/menu/${venueId}/items/${item.id}/modifiers`).then(({ data }) => ({
            itemId: item.id,
            attached: data.some((g) => g.id === group.id),
          }))
        )
      );
      setAttachedItemIds(new Set(results.filter((r) => r.attached).map((r) => r.itemId)));
    } catch {
      setAttachedItemIds(new Set());
    }
  }

  function handleToggle() {
    onToggle();
    if (!expanded) loadAttachments();
  }

  async function addOption() {
    if (!newOption.name.trim()) return;
    setAddingOption(true);
    try {
      await api.post(`/menu/${venueId}/modifier-groups/${group.id}/options`, {
        name: newOption.name,
        priceAdjustment: Number(newOption.priceAdjustment) || 0,
        isDefault: newOption.isDefault,
      });
      setNewOption({ name: '', priceAdjustment: '', isDefault: false });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setAddingOption(false);
    }
  }

  async function deleteOption(optionId) {
    try {
      await api.delete(`/menu/${venueId}/modifier-groups/${group.id}/options/${optionId}`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function toggleItemAttachment(item) {
    const attached = attachedItemIds?.has(item.id);
    try {
      const { data: currentModifiers } = await api.get(`/menu/${venueId}/items/${item.id}/modifiers`);
      const currentGroupIds = currentModifiers.map((g) => g.id);
      const newGroupIds = attached
        ? currentGroupIds.filter((id) => id !== group.id)
        : [...currentGroupIds, group.id];
      await api.put(`/menu/${venueId}/items/${item.id}/modifiers`, { groupIds: newGroupIds });
      loadAttachments();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  return (
    <Card style={{ marginBottom: 10 }}>
      <Row between>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{group.name}</T>
          <Muted style={{ fontSize: 11, marginTop: 2 }}>
            {t(`modifierType_${group.type}`)}
            {group.isRequired ? ` — ${t('required')}` : ''}
            {group.minSelections > 0 ? ` — ${t('minSelections')}: ${n(group.minSelections)}` : ''}
            {group.maxSelections !== null ? ` — ${t('maxSelections')}: ${n(group.maxSelections)}` : ''}
          </Muted>
        </View>
      </Row>
      <Row style={{ gap: 8, marginTop: 10 }}>
        <Button small variant="ghost" title={expanded ? t('close') : t('manage')} onPress={handleToggle} />
        <Button small variant="danger" title={t('delete')} onPress={onDelete} />
      </Row>

      {expanded && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.surfaceHigh, gap: 12 }}>
          <View>
            <T style={{ fontFamily: fonts.medium, fontSize: 13, marginBottom: 8 }}>{t('options')}</T>
            {(group.options || []).map((opt) => (
              <Row key={opt.id} between style={{ paddingVertical: 6 }}>
                <T style={{ fontSize: 13 }}>
                  {opt.name}
                  {Number(opt.priceAdjustment) !== 0 ? ` +${money(opt.priceAdjustment)}` : ''}
                  {opt.isDefault ? ` (${t('defaultOption')})` : ''}
                </T>
                <Button small variant="ghost" title={t('delete')} onPress={() => deleteOption(opt.id)} />
              </Row>
            ))}
            <Row style={{ gap: 8, marginTop: 8 }}>
              <Input
                style={{ flex: 1 }}
                placeholder={t('optionNamePlaceholder')}
                value={newOption.name}
                onChangeText={(v) => setNewOption((f) => ({ ...f, name: v }))}
              />
              <Input
                style={{ width: 100 }}
                placeholder={t('priceAdjustment')}
                keyboardType="numeric"
                value={newOption.priceAdjustment}
                onChangeText={(v) => setNewOption((f) => ({ ...f, priceAdjustment: v }))}
              />
              <Button small title={addingOption ? t('loading') : t('add')} onPress={addOption} disabled={addingOption} />
            </Row>
          </View>

          <View>
            <T style={{ fontFamily: fonts.medium, fontSize: 13, marginBottom: 8 }}>{t('attachToMenuItems')}</T>
            {attachedItemIds === null ? (
              <Muted style={{ fontSize: 12 }}>{t('loading')}</Muted>
            ) : (
              <Row style={{ gap: 6, flexWrap: 'wrap' }}>
                {menuItems.map((item) => (
                  <Chip
                    key={item.id}
                    label={item.name}
                    active={attachedItemIds.has(item.id)}
                    onPress={() => toggleItemAttachment(item)}
                  />
                ))}
              </Row>
            )}
          </View>
        </View>
      )}
    </Card>
  );
}
