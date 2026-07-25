import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Badge, Button, Card, Icon, Row, T } from './UI';
import { useI18n } from '../i18n';

function initSelections(modifierGroups) {
  const init = {};
  for (const group of modifierGroups) {
    if (group.type === 'MULTI_SELECT') {
      init[group.id] = group.options.filter((o) => o.isDefault).map((o) => o.id);
    } else {
      // SINGLE_SELECT and TOGGLE_REMOVE both start from the default option(s).
      const defaults = group.options.filter((o) => o.isDefault).map((o) => o.id);
      init[group.id] = group.type === 'SINGLE_SELECT' ? defaults.slice(0, 1) : defaults;
    }
  }
  return init;
}

export function CustomizationSheet({ visible, item, onClose, onConfirm }) {
  const { t, money } = useI18n();
  const modifierGroups = item?.modifierGroups || [];
  const [selections, setSelections] = useState(() => initSelections(modifierGroups));

  function toggleOption(group, optionId) {
    setSelections((prev) => {
      const cur = prev[group.id] || [];
      if (group.type === 'SINGLE_SELECT') {
        return { ...prev, [group.id]: [optionId] };
      }
      const has = cur.includes(optionId);
      if (has) return { ...prev, [group.id]: cur.filter((id) => id !== optionId) };
      const max = group.maxSelections;
      if (max !== null && max !== undefined && cur.length >= max) return prev;
      return { ...prev, [group.id]: [...cur, optionId] };
    });
  }

  const priceAdjustment = useMemo(
    () =>
      modifierGroups.reduce((total, group) => {
        return (
          total +
          (selections[group.id] || []).reduce((s, optId) => {
            const opt = group.options.find((o) => o.id === optId);
            return s + Number(opt?.priceAdjustment || 0);
          }, 0)
        );
      }, 0),
    [modifierGroups, selections]
  );

  const isValid = modifierGroups.every((group) => {
    const sel = selections[group.id] || [];
    if (group.isRequired && group.minSelections > 0 && sel.length < group.minSelections) return false;
    if (group.maxSelections !== null && group.maxSelections !== undefined && sel.length > group.maxSelections) return false;
    return true;
  });

  function handleConfirm() {
    const modifierSelections = modifierGroups
      .map((group) => ({ groupId: group.id, optionIds: selections[group.id] || [] }))
      .filter((s) => s.optionIds.length > 0);
    onConfirm(modifierSelections);
    setSelections(initSelections(modifierGroups));
  }

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Card
          style={{
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderBottomWidth: 0,
            padding: 20,
            maxHeight: '85%',
          }}
        >
          <Row between style={{ marginBottom: 12 }}>
            <T style={{ fontFamily: fonts.black, fontSize: 17, flex: 1 }}>{item.name}</T>
            <Pressable onPress={onClose} hitSlop={10}>
              <Icon name="x" size={20} color={colors.inkFaint} />
            </Pressable>
          </Row>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {modifierGroups.map((group) => (
              <View key={group.id} style={{ marginBottom: 18 }}>
                <Row style={{ gap: 6, marginBottom: 8 }}>
                  <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{group.name}</T>
                  {!!group.isRequired && <Badge label={t('required')} tone="gold" />}
                  {group.maxSelections != null && (
                    <T style={{ fontSize: 11, color: colors.inkMuted }}>
                      {t('maxSelect', { n: group.maxSelections })}
                    </T>
                  )}
                </Row>
                <Row style={{ gap: 8, flexWrap: 'wrap' }}>
                  {group.options.map((opt) => {
                    const active = (selections[group.id] || []).includes(opt.id);
                    const adj = Number(opt.priceAdjustment || 0);
                    return (
                      <Pressable
                        key={opt.id}
                        onPress={() => toggleOption(group, opt.id)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: radius.full,
                          backgroundColor: active ? colors.gold300 : colors.surfaceHigh,
                        }}
                      >
                        <T
                          style={{
                            fontSize: 13,
                            fontFamily: active ? fonts.bold : fonts.medium,
                            color: active ? colors.charcoal : colors.ink,
                          }}
                        >
                          {opt.name}
                          {adj !== 0 ? ` (+${money(adj)})` : ''}
                        </T>
                      </Pressable>
                    );
                  })}
                </Row>
              </View>
            ))}
          </ScrollView>

          <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
            <Row between style={{ marginBottom: 10 }}>
              <T style={{ fontSize: 13, color: colors.inkMuted }}>{t('finalPrice')}</T>
              <T style={{ fontFamily: fonts.black, fontSize: 17, color: colors.gold300 }}>
                {money(Number(item.price) + priceAdjustment)}
              </T>
            </Row>
            <Button title={t('addToCart')} onPress={handleConfirm} disabled={!isValid} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
