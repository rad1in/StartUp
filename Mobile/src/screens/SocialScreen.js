import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Button, EmptyState, Icon, Input, T, Title } from '../components/UI';
import { ShimmerBlock } from '../components/Shimmer';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

const GAP = 2;
const COLUMNS = 3;
const TILE_SIZE = (Dimensions.get('window').width - GAP * (COLUMNS - 1)) / COLUMNS;

export default function SocialScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { user } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const loadingFirstPage = useRef(false);

  const loadFirstPage = useCallback(async () => {
    if (loadingFirstPage.current) return;
    loadingFirstPage.current = true;
    try {
      const { data } = await api.get('/social/posts', { params: { page: 1 } });
      setPosts(data);
      setPage(1);
      setHasMore(data.length === 20);
    } catch {
      setPosts([]);
    } finally {
      loadingFirstPage.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage])
  );

  async function loadMore() {
    if (loadingMore || !hasMore || !posts) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { data } = await api.get('/social/posts', { params: { page: nextPage } });
      setPosts((prev) => [...prev, ...data]);
      setPage(nextPage);
      setHasMore(data.length === 20);
    } catch {
      /* keep current list, allow retry on next scroll */
    } finally {
      setLoadingMore(false);
    }
  }

  if (posts === null) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <ShimmerBlock key={i} width={TILE_SIZE} height={TILE_SIZE} style={{ marginRight: GAP, marginBottom: GAP, borderRadius: 0 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        numColumns={COLUMNS}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 120 }}
        onEndReachedThreshold={0.6}
        onEndReached={loadMore}
        ListHeaderComponent={
          <View style={styles.header}>
            <Title>{t('socialTitle')}</Title>
            {user && (
              <Pressable
                onPress={() => setComposerOpen(true)}
                style={styles.newPostBtn}
                accessibilityLabel={t('socialNewPost')}
              >
                <Icon name="plus" size={20} color={colors.charcoal} />
              </Pressable>
            )}
          </View>
        }
        ListEmptyComponent={<EmptyState icon="image" title={t('socialEmpty')} />}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.gold300} /> : null}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => router.push(`/social-post/${item.id}`)}
            style={{ marginRight: (index + 1) % COLUMNS === 0 ? 0 : GAP, marginBottom: GAP }}
          >
            <Image source={{ uri: imageUrl(item.imageUrl) }} style={{ width: TILE_SIZE, height: TILE_SIZE, backgroundColor: colors.surfaceHigh }} />
          </Pressable>
        )}
      />

      {composerOpen && (
        <ComposerModal
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            loadFirstPage();
          }}
        />
      )}
    </View>
  );
}

function ComposerModal({ onClose, onPosted }) {
  const { t } = useI18n();
  const toast = useToast();
  const [asset, setAsset] = useState(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.75,
      allowsEditing: true,
      aspect: [4, 5],
    });
    if (result.canceled) return;
    setAsset(result.assets[0]);
  }

  async function submit() {
    if (!asset) return;
    setPosting(true);
    try {
      const formData = new FormData();
      formData.append('image', { uri: asset.uri, name: asset.fileName || 'post.jpg', type: asset.mimeType || 'image/jpeg' });
      if (caption) formData.append('caption', caption);
      await api.post('/social/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onPosted();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
        <T style={{ fontFamily: fonts.bold, fontSize: 16, marginBottom: 14 }}>{t('socialNewPost')}</T>

        <Pressable onPress={pickImage} style={styles.pickerBox}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={styles.pickerPreview} />
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Icon name="image" size={26} color={colors.gold300} />
              <T style={{ fontSize: 12, marginTop: 8, color: colors.inkMuted }}>{t('socialPickImage')}</T>
            </View>
          )}
        </Pressable>

        <Input
          placeholder={t('socialCaptionPlaceholder')}
          value={caption}
          onChangeText={setCaption}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top', marginTop: 12 }}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
          <Button title={t('cancel')} variant="ghost" onPress={onClose} style={{ flex: 1 }} disabled={posting} />
          <Button
            title={posting ? t('sending') : t('socialShare')}
            onPress={submit}
            disabled={posting || !asset}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  newPostBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.gold300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 20,
  },
  pickerBox: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerPreview: { width: '100%', height: '100%' },
});
