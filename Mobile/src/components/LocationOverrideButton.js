import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Map, Camera, ViewAnnotation } from '@maplibre/maplibre-react-native';
import { Button, Icon, T } from './UI';
import { useLocationOverride } from '../context/LocationOverrideContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';
import { MAP_STYLE_URL } from '../mapStyle';

const TEHRAN = { lat: 35.6892, lng: 51.389 };

// variant "icon" — a compact circular button (Home header row, or floating
// over the Search map). variant "pill" — labeled button with text.
export function LocationOverrideButton({ style, variant = 'pill' }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { manualLocation, setManualLocation, clearManualLocation } = useLocationOverride();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pin, setPin] = useState(manualLocation || TEHRAN);

  const active = !!manualLocation;

  function handlePress() {
    if (active) {
      clearManualLocation();
    } else {
      setPin(manualLocation || TEHRAN);
      setPickerVisible(true);
    }
  }

  function confirmPin() {
    setManualLocation(pin);
    setPickerVisible(false);
  }

  return (
    <>
      {variant === 'icon' ? (
        <Pressable
          onPress={handlePress}
          style={[styles.iconBtn, active && styles.iconBtnActive, style]}
          hitSlop={6}
        >
          <Icon name={active ? 'map-pin' : 'alert-triangle'} size={18} color={active ? colors.charcoal : colors.ink} />
        </Pressable>
      ) : (
        <Button
          small
          icon={active ? 'map-pin' : 'alert-triangle'}
          variant={active ? 'primary' : 'ghost'}
          title={active ? t('gpsManualActive') : t('gpsIssueButton')}
          onPress={handlePress}
          style={style}
        />
      )}

      <Modal visible={pickerVisible} animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
            <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('gpsPickerTitle')}</T>
            <T style={{ fontSize: 12, color: colors.ink, opacity: 0.6, marginTop: 4 }}>{t('gpsPickerHint')}</T>
          </View>
          <Map
            style={{ flex: 1 }}
            mapStyle={MAP_STYLE_URL}
            onPress={(e) => setPin({ lat: e.nativeEvent.lngLat[1], lng: e.nativeEvent.lngLat[0] })}
          >
            <Camera initialViewState={{ center: [pin.lng, pin.lat], zoom: 14 }} />
            <ViewAnnotation
              lngLat={[pin.lng, pin.lat]}
              draggable
              onDragEnd={(e) => setPin({ lat: e.nativeEvent.lngLat[1], lng: e.nativeEvent.lngLat[0] })}
            >
              <View style={styles.pin} />
            </ViewAnnotation>
          </Map>
          <View style={styles.footer}>
            <Button title={t('cancel')} variant="ghost" onPress={() => setPickerVisible(false)} style={{ flex: 1 }} />
            <Button title={t('gpsPickerConfirm')} onPress={confirmPin} style={{ flex: 1 }} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: colors.gold300 },
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.gold300,
    borderWidth: 2.5,
    borderColor: colors.charcoal,
  },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
