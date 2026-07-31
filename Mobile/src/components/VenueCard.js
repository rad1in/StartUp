import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { imageUrl } from '../api/client';
import { Badge, Card, Icon, Muted, Row, T } from './UI';
import { PressableScale } from './motion';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

export function VenueCard({ venue, onPress, distanceMeters }) {
  const { t, n, isRTL } = useI18n();
  const cover = imageUrl(venue.coverImageUrl || venue.logoUrl);
  const hasRating = venue.averageRating != null && Number(venue.averageRating) > 0;

  return (
    <PressableScale onPress={onPress} style={{ marginBottom: 20 }}>
      <Card style={{ padding: 0, overflow: 'hidden', borderRadius: radius.xxl }}>
        <View style={styles.coverWrap}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverFallback]}>
              <Icon name="coffee" size={32} color={colors.gold300} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(13,12,10,0.55)', 'rgba(13,12,10,0.92)']}
            style={styles.scrim}
            pointerEvents="none"
          />

          {hasRating && (
            <View style={[styles.pill, styles.ratingPill, isRTL ? { left: 10 } : { right: 10 }]}>
              <Icon name="star" size={11} color={colors.gold300} />
              <T style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.gold300 }}>
                {Number(venue.averageRating).toLocaleString(isRTL ? 'fa-IR' : 'en-US', { maximumFractionDigits: 1 })}
              </T>
            </View>
          )}

          {!!venue.isTemporarilyClosed && (
            <View style={[styles.pill, styles.closedPill, isRTL ? { right: 10 } : { left: 10 }]}>
              <Icon name="clock" size={11} color={colors.ink} />
              <T style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.ink }}>{t('temporarilyClosed')}</T>
            </View>
          )}

          <View style={styles.overlayText}>
            <T
              style={{ fontFamily: fonts.black, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink }}
              numberOfLines={1}
            >
              {venue.name}
            </T>
            <Muted style={{ fontSize: 13, color: colors.gold100, marginTop: 4 }} numberOfLines={1}>
              {venue.city}
              {venue.neighborhood ? ` — ${venue.neighborhood}` : ''}
            </Muted>
          </View>
        </View>

        {(venue.acceptsPickup || venue.cuisineType || distanceMeters != null) && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Row style={{ gap: 6, flexWrap: 'wrap' }}>
              {distanceMeters != null && (
                <Badge icon="navigation" label={`${n(Math.round(distanceMeters))} ${isRTL ? 'متر' : 'm'}`} tone="gold" />
              )}
              {!!venue.acceptsPickup && <Badge icon="shopping-bag" label={t('pickup')} tone="green" />}
              {venue.cuisineType ? <Badge label={venue.cuisineType} tone="muted" /> : null}
            </Row>
          </View>
        )}
      </Card>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  coverWrap: { width: '100%', height: 215, backgroundColor: colors.surfaceHigh },
  cover: { width: '100%', height: '100%' },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  overlayText: { position: 'absolute', left: 14, right: 14, bottom: 12 },
  pill: {
    position: 'absolute',
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  ratingPill: { backgroundColor: 'rgba(13,12,10,0.7)' },
  closedPill: { backgroundColor: 'rgba(196,106,99,0.85)' },
});
