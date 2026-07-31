import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Button, Card, EmptyState, Icon, Loading, Muted, Row, T, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

function Thumb({ uri, iconName }) {
  return (
    <View
      style={{
        width: 52,
        height: 52,
        borderRadius: radius.md,
        backgroundColor: colors.surfaceHigh,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} /> : <Icon name={iconName} size={20} color={colors.gold300} />}
    </View>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { t, money } = useI18n();
  const toast = useToast();
  const [venues, setVenues] = useState(null);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const [{ data: v }, { data: i }] = await Promise.all([api.get('/favorites/venues'), api.get('/favorites/items')]);
      setVenues(v);
      setItems(i);
    } catch {
      setVenues([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!venues) return <Loading />;

  async function removeVenue(venueId) {
    await api.delete(`/favorites/venues/${venueId}`).catch(() => {});
    toast.info(t('removedFromFav'));
    load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 18 }}>{t('favorites')}</Title>

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('favCafes')}</T>
      {venues.length === 0 ? (
        <EmptyState icon="coffee" title={t('noFavCafes')} />
      ) : (
        venues.map((v) => (
          <Pressable key={v.id || v.venueId} onPress={() => router.push(`/venue/${v.id || v.venueId}`)}>
            <Card style={{ marginBottom: 10, paddingVertical: 14 }}>
              <Row between style={{ gap: 12 }}>
                <Row style={{ gap: 12, flex: 1 }}>
                  <Thumb uri={imageUrl(v.coverImageUrl || v.logoUrl)} iconName="coffee" />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{v.name || v.venueName}</T>
                    {v.city ? <Muted style={{ fontSize: 12, marginTop: 3 }}>{v.city}</Muted> : null}
                  </View>
                </Row>
                <Button small variant="danger" title={t('remove')} onPress={() => removeVenue(v.id || v.venueId)} />
              </Row>
            </Card>
          </Pressable>
        ))
      )}

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12, marginTop: 20 }}>{t('favItems')}</T>
      {items.length === 0 ? (
        <EmptyState icon="heart" title={t('noFavItems')} />
      ) : (
        items.map((item) => (
          <Card key={item.id || item.menuItemId} style={{ marginBottom: 10, paddingVertical: 14 }}>
            <Row between style={{ gap: 12 }}>
              <Row style={{ gap: 12, flex: 1 }}>
                <Thumb uri={imageUrl(item.imageUrl)} iconName="coffee" />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: fonts.medium, fontSize: 14 }}>{item.name || item.itemName}</T>
                  {item.venueName ? <Muted style={{ fontSize: 12, marginTop: 3 }}>{item.venueName}</Muted> : null}
                </View>
              </Row>
              {item.price != null && (
                <T style={{ color: colors.gold300, fontFamily: fonts.bold, fontSize: 14 }}>{money(item.price)}</T>
              )}
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}
