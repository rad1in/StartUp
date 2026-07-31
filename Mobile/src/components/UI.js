import { useRef } from 'react';
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Feather from '@expo/vector-icons/Feather';
import { colors, fonts, radius } from '../theme';
import { useI18n } from '../i18n';
import { SPRING, tapHaptic } from './motion';
import { useBattery } from '../context/BatteryContext';

// Feather is the closest icon family to the web's lucide set — same strokes.
export function Icon({ name, size = 18, color = colors.inkMuted, style }) {
  return <Feather name={name} size={size} color={color} style={style} />;
}

// ---------- Text ----------
export function T({ style, children, ...rest }) {
  const { isRTL } = useI18n();
  return (
    <Text
      style={[
        styles.baseText,
        { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

export function Title({ children, style }) {
  return <T style={[styles.title, style]}>{children}</T>;
}

export function Muted({ children, style }) {
  return <T style={[styles.muted, style]}>{children}</T>;
}

// ---------- Layout ----------
export function Screen({ children, style }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function Card({ children, style, gold }) {
  return <View style={[styles.card, gold && styles.cardGold, style]}>{children}</View>;
}

// Gradient "hero" card for the one headline number/value a screen is about
// (wallet balance, loyalty points, referral code). Charcoal text on gold —
// the loudest surface in the design system, so use at most one per screen.
export function GoldCard({ children, style }) {
  return (
    <View style={[styles.goldCard, style]}>
      <LinearGradient
        colors={[colors.gold200, colors.gold500]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.goldOrbA} pointerEvents="none" />
      <View style={styles.goldOrbB} pointerEvents="none" />
      {children}
    </View>
  );
}

// Direction-aware row: leading item is visually first in both LTR and RTL.
export function Row({ children, style, between }) {
  const { isRTL } = useI18n();
  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        between && { justifyContent: 'space-between' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---------- Controls ----------
export function Button({ title, onPress, variant = 'primary', disabled, style, small, icon }) {
  const { isRTL } = useI18n();
  const { isLowBattery } = useBattery();
  const scale = useRef(new Animated.Value(1)).current;
  const variantStyle =
    variant === 'primary' ? styles.btnPrimary : variant === 'danger' ? styles.btnDanger : styles.btnGhost;
  const textColor =
    variant === 'primary' ? colors.charcoal : variant === 'danger' ? colors.red : colors.ink;
  // Plain Pressable outside for reliable web taps; the visible button body is
  // an inner Animated.View so the whole pill scales on press.
  return (
    <Pressable
      onPressIn={() => {
        if (!disabled && !isLowBattery) Animated.spring(scale, { toValue: 0.95, ...SPRING }).start();
      }}
      onPressOut={() => {
        if (!isLowBattery) Animated.spring(scale, { toValue: 1, ...SPRING }).start();
      }}
      onPress={(e) => {
        if (disabled) return;
        tapHaptic(isLowBattery);
        onPress?.(e);
      }}
      disabled={disabled}
      style={style}
    >
      <Animated.View
        style={[
          styles.btn,
          { flexDirection: isRTL ? 'row-reverse' : 'row', overflow: 'hidden' },
          small && styles.btnSmall,
          variantStyle,
          disabled && { opacity: 0.45 },
          { transform: [{ scale }] },
        ]}
      >
        {variant === 'primary' && (
          <LinearGradient
            colors={[colors.gold200, colors.gold400]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {icon ? <Icon name={icon} size={small ? 14 : 17} color={textColor} /> : null}
        <T style={[styles.btnText, small && { fontSize: 13 }, { color: textColor, textAlign: 'center' }]}>
          {title}
        </T>
      </Animated.View>
    </Pressable>
  );
}

export function Input({ style, ...rest }) {
  const { isRTL } = useI18n();
  return (
    <TextInput
      placeholderTextColor={colors.inkFaint}
      style={[styles.input, style]}
      textAlign={isRTL ? 'right' : 'left'}
      {...rest}
    />
  );
}

export function Chip({ label, active, onPress, icon, image }) {
  const { isRTL } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
        active && { backgroundColor: colors.gold300 },
      ]}
    >
      {image ? (
        <Image source={image} style={{ width: 36, height: 14, marginEnd: 5, resizeMode: 'contain' }} />
      ) : icon ? (
        <Icon name={icon} size={12} color={active ? colors.charcoal : colors.inkMuted} style={{ marginEnd: 5 }} />
      ) : null}
      <T style={[styles.chipText, { textAlign: 'center' }, active && { color: colors.charcoal, fontFamily: fonts.bold }]}>
        {label}
      </T>
    </Pressable>
  );
}

export function Badge({ label, tone = 'gold', icon }) {
  const { isRTL } = useI18n();
  const tones = {
    gold: { bg: 'rgba(229,196,118,0.14)', color: colors.gold300 },
    green: { bg: colors.greenBg, color: colors.green },
    red: { bg: colors.redBg, color: colors.red },
    muted: { bg: 'rgba(253,252,248,0.08)', color: colors.inkMuted },
  };
  const t = tones[tone] || tones.gold;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {icon ? <Icon name={icon} size={11} color={t.color} /> : null}
      <T style={[styles.badgeText, { color: t.color, textAlign: 'center' }]}>{label}</T>
    </View>
  );
}

export function Loading({ text }) {
  const { t } = useI18n();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.gold300} size="large" />
      <Muted style={{ marginTop: 12, textAlign: 'center' }}>{text || t('loading')}</Muted>
    </View>
  );
}

export function EmptyState({ icon = 'coffee', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={colors.gold300} />
      </View>
      <T style={{ fontFamily: fonts.black, fontSize: 18, textAlign: 'center' }}>{title}</T>
      {subtitle ? <Muted style={{ marginTop: 8, textAlign: 'center' }}>{subtitle}</Muted> : null}
    </View>
  );
}

// Round icon button (header actions, steppers)
export function IconButton({ name, onPress, size = 18, color = colors.gold300, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }, disabled && { opacity: 0.4 }, style]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  baseText: { fontFamily: fonts.regular, color: colors.ink, fontSize: 15 },
  // Editorial scale — big, confident type is the whole point of this look:
  // headings do the visual work instead of borders, icons, or glow effects.
  // Display-weight screen title — deliberately large and tight so each screen
  // opens with a clear typographic anchor (matches the web's heading-display).
  title: { fontFamily: fonts.black, fontSize: 32, lineHeight: 40, letterSpacing: -0.5, color: colors.ink },
  muted: { color: colors.inkMuted, fontSize: 14 },
  screen: { flex: 1, backgroundColor: colors.bg },
  // Cards now carry a hairline border so they read as distinct raised objects
  // rather than faint tints of the page — the mobile half of the "bolder"
  // direction. Separation still comes mostly from margin + background contrast.
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardGold: { backgroundColor: colors.surfaceHigh, borderColor: colors.borderGold },
  goldCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    padding: 22,
  },
  goldOrbA: {
    position: 'absolute',
    top: -34,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  goldOrbB: {
    position: 'absolute',
    bottom: -48,
    left: -24,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(29,27,22,0.12)',
  },
  row: { alignItems: 'center', gap: 8 },
  btn: {
    borderRadius: radius.full,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 16 },
  btnText: { fontFamily: fonts.bold, fontSize: 16 },
  btnPrimary: { backgroundColor: colors.gold300 },
  btnGhost: { backgroundColor: colors.surfaceHigh },
  btnDanger: { backgroundColor: colors.redBg },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 15,
    color: colors.ink,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  chip: {
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.inkMuted },
  badge: {
    borderRadius: radius.full,
    paddingHorizontal: 11,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 4,
  },
  badgeText: { fontFamily: fonts.bold, fontSize: 11 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 28 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
