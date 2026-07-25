import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

// A single shimmering placeholder block. A soft highlight sweeps across a
// muted base — the modern, premium alternative to a spinner. Built on RN's
// own Animated API (no native module) so it works in Expo Go unconditionally.
function ShimmerBlock({ width = '100%', height = 16, style }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, { toValue: 1, duration: 575, useNativeDriver: true }),
        Animated.timing(progress, { toValue: 0, duration: 575, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <View style={[styles.base, { width, height }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.glow, { opacity }]} />
    </View>
  );
}

// Prebuilt loading placeholder that mirrors the venue-card list on Home, so
// the transition from loading → loaded feels seamless instead of a hard swap.
export function VenueListSkeleton({ count = 5 }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.card}>
          <ShimmerBlock height={190} style={{ borderRadius: 0 }} />
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ShimmerBlock width={64} height={22} style={{ borderRadius: radius.full }} />
              <ShimmerBlock width={48} height={22} style={{ borderRadius: radius.full }} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

// Generic stacked-row skeleton for detail/list screens (wallet, orders, ...).
export function RowsSkeleton({ count = 5 }) {
  return (
    <View style={{ padding: 16, gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <ShimmerBlock width="60%" height={15} />
          <ShimmerBlock width="30%" height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

export { ShimmerBlock };

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  glow: { backgroundColor: 'rgba(229,196,118,0.10)' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    marginBottom: 20,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 18,
  },
});
