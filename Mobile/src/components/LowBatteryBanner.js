import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBattery } from '../context/BatteryContext';
import { useI18n } from '../i18n';
import { Icon, T } from './UI';
import { colors, fonts, radius } from '../theme';

const AUTO_HIDE_MS = 5500;

// A bottom "system notification" style banner that appears once when the
// app crosses into low-battery mode (see BatteryContext's hysteresis), then
// auto-dismisses. Purely informational — the real effect (fewer animations,
// no haptics, slower polling) happens elsewhere via useBattery().
export function LowBatteryBanner() {
  const { isLowBattery } = useBattery();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(140)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const wasLow = useRef(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (isLowBattery && !wasLow.current) {
      setVisible(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: 140, duration: 260, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start(() => setVisible(false));
      }, AUTO_HIDE_MS);
    }
    wasLow.current = isLowBattery;
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [isLowBattery, translateY, opacity]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { bottom: insets.bottom + 90, opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Icon name="battery" size={16} color={colors.gold300} />
        </View>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 13 }}>{t('lowBatteryTitle')}</T>
          <T style={{ fontSize: 11, color: colors.inkMuted, marginTop: 2 }}>{t('lowBatteryMessage')}</T>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(229,196,118,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
