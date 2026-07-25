import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card, EmptyState, Icon, Muted, Row, T } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';
import { WEB_PANEL_BASE } from '../api/client';

const CUSTOMER_ITEMS = [
  { icon: 'credit-card', key: 'wallet', path: '/wallet' },
  { icon: 'zap', key: 'subscription', path: '/subscription' },
  { icon: 'gift', key: 'referral', path: '/referral' },
  { icon: 'award', key: 'loyalty', path: '/loyalty' },
  { icon: 'heart', key: 'favorites', path: '/favorites' },
  { icon: 'bell', key: 'notifications', path: '/notifications' },
  { icon: 'star', key: 'myReviews', path: '/reviews' },
  { icon: 'life-buoy', key: 'support', path: '/support' },
  { icon: 'coffee', key: 'registerVenue', path: '/register-venue' },
  { icon: 'user', key: 'editProfile', path: '/profile' },
  { icon: 'shield', key: 'accountDangerZone', path: '/danger-zone' },
];

// Applies to every signed-in role, not just customers — staff/owners have
// login sessions and 2FA too.
const COMMON_ITEMS = [{ icon: 'lock', key: 'sessionsAnd2fa', path: '/sessions' }];

// Opened in an in-app browser against the web app rather than duplicated as
// native screens — one source of truth for legal content.
const LEGAL_ITEMS = [
  { icon: 'file-text', key: 'termsOfService', path: '/terms' },
  { icon: 'shield', key: 'privacyPolicy', path: '/privacy' },
];

export default function AccountScreen() {
  const router = useRouter();
  const { t, lang, setLang, isRTL, languages } = useI18n();
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const chevron = isRTL ? 'chevron-left' : 'chevron-right';

  const languageRow = (
    <Card style={styles.menuRow}>
      <Row between>
        <Row style={{ gap: 12 }}>
          <View style={styles.rowIcon}>
            <Icon name="globe" size={16} color={colors.gold300} />
          </View>
          <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{t('language')}</T>
        </Row>
        <Row style={{ gap: 6, flexWrap: 'wrap' }}>
          {languages.map((l) => (
            <LangPill key={l.code} label={l.label} active={lang === l.code} onPress={() => setLang(l.code)} />
          ))}
        </Row>
      </Row>
    </Card>
  );

  if (!user) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 24, paddingBottom: 120 }}
      >
        <EmptyState icon="user" title={t('notSignedIn')} subtitle={t('notSignedInHint')} />
        <View style={{ paddingHorizontal: 16, gap: 10, marginBottom: 16 }}>
          <Button title={t('signIn')} onPress={() => router.push('/login')} />
          <Button title={t('signUp')} variant="ghost" onPress={() => router.push('/register')} />
        </View>
        {languageRow}
      </ScrollView>
    );
  }

  const isStaff = ['VENUE_OWNER', 'VENUE_STAFF', 'SUPER_ADMIN', 'SUPPORT_STAFF', 'FINANCE_STAFF'].includes(user.role);
  const isCustomer = user.role === 'CUSTOMER';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 12, paddingBottom: 120 }}
    >
      <Card gold style={{ marginBottom: 20, alignItems: 'center', paddingVertical: 28 }}>
        <LinearGradient
          colors={[colors.gold200, colors.gold500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatar}>
            <T style={{ fontFamily: fonts.black, fontSize: 26, color: colors.gold300, textAlign: 'center' }}>
              {user.name?.slice(0, 1)}
            </T>
          </View>
        </LinearGradient>
        <T style={{ fontFamily: fonts.black, fontSize: 20, marginTop: 14, textAlign: 'center' }}>{user.name}</T>
        <Muted style={{ marginTop: 4, fontSize: 13, textAlign: 'center' }}>{user.email}</Muted>
      </Card>

      {languageRow}

      {COMMON_ITEMS.map((item) => (
        <Pressable key={item.path} onPress={() => router.push(item.path)}>
          <Card style={styles.menuRow}>
            <Row between>
              <Row style={{ gap: 12 }}>
                <View style={styles.rowIcon}>
                  <Icon name={item.icon} size={16} color={colors.gold300} />
                </View>
                <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{t(item.key)}</T>
              </Row>
              <Icon name={chevron} size={16} color={colors.inkFaint} />
            </Row>
          </Card>
        </Pressable>
      ))}

      {isCustomer &&
        CUSTOMER_ITEMS.map((item) => (
          <Pressable key={item.path} onPress={() => router.push(item.path)}>
            <Card style={styles.menuRow}>
              <Row between>
                <Row style={{ gap: 12 }}>
                  <View style={styles.rowIcon}>
                    <Icon name={item.icon} size={16} color={colors.gold300} />
                  </View>
                  <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{t(item.key)}</T>
                </Row>
                <Icon name={chevron} size={16} color={colors.inkFaint} />
              </Row>
            </Card>
          </Pressable>
        ))}

      {LEGAL_ITEMS.map((item) => (
        <Pressable key={item.path} onPress={() => WebBrowser.openBrowserAsync(`${WEB_PANEL_BASE}${item.path}`)}>
          <Card style={styles.menuRow}>
            <Row between>
              <Row style={{ gap: 12 }}>
                <View style={styles.rowIcon}>
                  <Icon name={item.icon} size={16} color={colors.gold300} />
                </View>
                <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{t(item.key)}</T>
              </Row>
              <Icon name="external-link" size={16} color={colors.inkFaint} />
            </Row>
          </Card>
        </Pressable>
      ))}

      {isStaff && (
        <Pressable onPress={() => router.push('/admin-panel')}>
          <Card gold style={styles.menuRow}>
            <Row between>
              <Row style={{ gap: 12 }}>
                <View style={styles.rowIcon}>
                  <Icon name="tool" size={16} color={colors.gold300} />
                </View>
                <View>
                  <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{t('adminPanel')}</T>
                  <Muted style={{ fontSize: 12, marginTop: 2 }}>{t('adminPanelHint')}</Muted>
                </View>
              </Row>
              <Icon name={chevron} size={16} color={colors.inkFaint} />
            </Row>
          </Card>
        </Pressable>
      )}

      <Button title={t('signOut')} variant="danger" icon="log-out" onPress={logout} style={{ marginTop: 14 }} />
    </ScrollView>
  );
}

function LangPill({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.langPill, active && { backgroundColor: colors.gold300, borderColor: colors.gold300 }]}
    >
      <T
        style={{
          fontSize: 12,
          fontFamily: fonts.medium,
          textAlign: 'center',
          color: active ? colors.charcoal : colors.inkMuted,
        }}
      >
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatarRing: {
    width: 76,
    height: 76,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(229,196,118,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRow: { marginBottom: 10, paddingVertical: 14 },
  langPill: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: colors.surfaceHigh,
  },
});
