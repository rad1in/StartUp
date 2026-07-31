import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { T } from './UI';
import { colors, fonts, radius } from '../theme';
import { useI18n } from '../i18n';
import { PressableScale, AppearUp } from './motion';

const ICON_DEFS = {
  search: { name: 'search' },
  scan: { name: 'qrcode-scan', mci: true },
  index: { name: 'home' },
  social: { name: 'grid', mci: false },
  account: { name: 'user' },
};

// Custom floating glass tab bar — Android only. NativeTabs' Android
// BottomNavigationView renders flat here and its Material icon ligatures
// don't load reliably on this build, so this hand-builds real frosted glass
// (blur + gradient sheen + an ambient gold halo + a lit active pill) instead
// of relying on the OS icon font. iOS keeps NativeTabs — real Liquid Glass —
// completely untouched.
export default function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useI18n();
  const routes = isRTL ? [...state.routes].reverse() : state.routes;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <AppearUp from={26} style={styles.shadowWrap}>
        <BlurView intensity={82} tint="dark" style={styles.bar}>
          <View style={styles.tint} pointerEvents="none" />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 0.9 }}
            style={styles.sheen}
          />
          <View style={styles.ringOuter} pointerEvents="none" />
          <View style={styles.ringInner} pointerEvents="none" />

          {routes.map((route) => {
            const routeIndex = state.routes.indexOf(route);
            const focused = state.index === routeIndex;
            const { options } = descriptors[route.key];
            const def = ICON_DEFS[route.name] || ICON_DEFS.index;
            const iconColor = focused ? colors.charcoal : colors.inkMuted;

            const onPress = () => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            };

            return (
              <PressableScale
                key={route.key}
                onPress={onPress}
                style={styles.tab}
                contentStyle={styles.tabContent}
                scaleTo={0.86}
                hitSlop={8}
              >
                <View style={styles.iconSlot}>
                  {focused && (
                    <LinearGradient
                      colors={[colors.gold100, colors.gold300, colors.gold500]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconWrapActive}
                    />
                  )}
                  <View style={styles.iconWrap}>
                    {def.mci ? (
                      <MaterialCommunityIcons name={def.name} size={20} color={iconColor} />
                    ) : (
                      <Feather name={def.name} size={19} color={iconColor} />
                    )}
                  </View>
                </View>
                <T style={[styles.label, { color: focused ? colors.gold300 : colors.inkMuted }]} numberOfLines={1}>
                  {options.title}
                </T>
                {focused && <View style={styles.dot} />}
              </PressableScale>
            );
          })}
        </BlurView>
      </AppearUp>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    alignItems: 'center',
  },
  shadowWrap: {
    width: '100%',
    borderRadius: radius.full,
    shadowColor: colors.gold400,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: radius.full,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(229,196,118,0.35)',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(18,18,20,0.34)',
  },
  sheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '60%',
  },
  ringOuter: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  ringInner: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: {
    flex: 1,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 13,
  },
  iconSlot: {
    width: 46,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.full,
    shadowColor: colors.gold400,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.55,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  dot: {
    position: 'absolute',
    bottom: 4,
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: colors.gold300,
  },
});
