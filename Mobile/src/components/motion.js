import { useEffect, useRef } from 'react';
import { Animated, Pressable, Platform } from 'react-native';
import { useBattery } from '../context/BatteryContext';

// Uses React Native's built-in Animated API — no native TurboModule, so it
// works in Expo Go with zero native-config risk (unlike react-native-
// reanimated/worklets, which needs a matching native build and crashed here
// with "Exception in HostFunction" under Expo Go SDK 54).
export const SPRING = { friction: 9, tension: 140, useNativeDriver: true };
export const SOFT_SPRING = { friction: 10, tension: 90, useNativeDriver: true };

// Fires a subtle tap on native; silently no-ops on web (import lazily so the
// web bundle never touches the native module) and in low-battery mode, where
// haptic motors are skipped to save power.
export function tapHaptic(skip = false) {
  if (Platform.OS === 'web' || skip) return;
  try {
    // eslint-disable-next-line global-require
    const Haptics = require('expo-haptics');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    /* haptics unavailable */
  }
}

// The signature iOS micro-interaction: press down → gentle scale-in + optional
// haptic, release → spring back. Wrap cards, tiles, list rows, anything tappable.
export function PressableScale({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  contentStyle,
  scaleTo = 0.96,
  haptic = true,
  hitSlop,
}) {
  const { isLowBattery } = useBattery();
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Pressable
      onPressIn={() => {
        // Skip the scale spring in low-battery mode too — it's a continuous
        // animation loop while the finger is down, the priciest kind to run.
        if (!isLowBattery) Animated.spring(scale, { toValue: scaleTo, ...SPRING }).start();
      }}
      onPressOut={() => {
        if (!isLowBattery) Animated.spring(scale, { toValue: 1, ...SPRING }).start();
      }}
      onPress={(e) => {
        if (haptic) tapHaptic(isLowBattery);
        onPress?.(e);
      }}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={style}
    >
      <Animated.View style={[{ transform: [{ scale }] }, contentStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// Staggered reveal for list items — each fades up a touch after the previous,
// giving that polished "content cascading in" feel. `index` drives the delay.
// Skipped entirely in low-battery mode: content renders at full opacity
// immediately instead of running a spring per row.
export function AppearUp({ children, index = 0, style, delayStep = 55, from = 16 }) {
  const { isLowBattery } = useBattery();
  const p = useRef(new Animated.Value(isLowBattery ? 1 : 0)).current;
  useEffect(() => {
    if (isLowBattery) return undefined;
    const anim = Animated.spring(p, { toValue: 1, delay: index * delayStep, friction: 9, tension: 100, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (isLowBattery) return <Animated.View style={style}>{children}</Animated.View>;
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[{ opacity: p, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

// Gentle whole-screen fade + slight rise for content mount (headers, heroes).
// Same low-battery skip as AppearUp.
export function AppearFade({ children, delay = 0, duration = 420, from = 8, style }) {
  const { isLowBattery } = useBattery();
  const p = useRef(new Animated.Value(isLowBattery ? 1 : 0)).current;
  useEffect(() => {
    if (isLowBattery) return undefined;
    const anim = Animated.timing(p, { toValue: 1, delay, duration, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (isLowBattery) return <Animated.View style={style}>{children}</Animated.View>;
  const translateY = p.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return <Animated.View style={[{ opacity: p, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

export { Animated };
