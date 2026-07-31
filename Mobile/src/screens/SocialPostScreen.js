import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, { imageUrl } from '../api/client';
import { Icon, Loading, Muted, Row, T } from '../components/UI';
import { tapHaptic } from '../components/motion';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

const DOUBLE_TAP_MS = 280;

export default function SocialPostScreen() {
  const { postId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, n, date } = useI18n();
  const { user } = useAuth();
  const [post, setPost] = useState(null);
  const lastTapRef = useRef(0);
  const heartScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    api
      .get(`/social/posts/${postId}`)
      .then(({ data }) => setPost(data))
      .catch(() => setPost(false));
  }, [postId]);

  function burstHeart() {
    heartScale.setValue(0);
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }),
      Animated.timing(heartScale, { toValue: 0, duration: 220, delay: 250, useNativeDriver: true }),
    ]).start();
  }

  async function like(force) {
    if (!user || !post) {
      if (!user) router.push('/login');
      return;
    }
    // "force" is set by the double-tap gesture — Instagram-style: double tap
    // only ever likes, it never unlikes an already-liked post.
    if (force && post.isLikedByMe) return;
    tapHaptic();
    const prev = post;
    setPost({ ...post, isLikedByMe: !post.isLikedByMe, likeCount: post.likeCount + (post.isLikedByMe ? -1 : 1) });
    try {
      const { data } = await api.post(`/social/posts/${postId}/like`);
      setPost((p) => (p ? { ...p, isLikedByMe: data.isLikedByMe, likeCount: data.likeCount } : p));
    } catch {
      setPost(prev);
    }
  }

  function onImagePress() {
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      burstHeart();
      like(true);
    }
    lastTapRef.current = now;
  }

  if (post === null) return <Loading />;
  if (post === false) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <T>{t('socialPostNotFound')}</T>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <Icon name="arrow-right" size={20} color={colors.ink} />
        </Pressable>
      </View>

      <Row style={{ paddingHorizontal: 16, marginBottom: 10, gap: 10 }}>
        <Avatar uri={imageUrl(post.avatarUrl)} name={post.userName} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{post.username ? `@${post.username}` : post.userName}</T>
        </View>
      </Row>

      <Pressable onPress={onImagePress}>
        <View>
          <Image source={{ uri: imageUrl(post.imageUrl) }} style={styles.image} />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.heartOverlay,
              {
                opacity: heartScale,
                transform: [{ scale: heartScale.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1.15] }) }],
              },
            ]}
          >
            <Icon name="heart" size={90} color="#fff" />
          </Animated.View>
        </View>
      </Pressable>

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Row style={{ gap: 16 }}>
          <Pressable onPress={() => like(false)} hitSlop={8}>
            <Row style={{ gap: 6 }}>
              <Icon name="heart" size={24} color={post.isLikedByMe ? colors.red : colors.ink} />
              <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{n(post.likeCount)}</T>
            </Row>
          </Pressable>
        </Row>

        {post.caption ? (
          <T style={{ marginTop: 12, lineHeight: 22 }}>
            <T style={{ fontFamily: fonts.bold }}>{post.username ? `@${post.username}` : post.userName} </T>
            {post.caption}
          </T>
        ) : null}

        <Muted style={{ marginTop: 10, fontSize: 12 }}>{date(post.createdAt)}</Muted>
      </View>
    </ScrollView>
  );
}

function Avatar({ uri, name }) {
  return (
    <View style={styles.avatar}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: radius.full }} />
      ) : (
        <T style={{ fontFamily: fonts.bold, fontSize: 14, color: colors.gold300 }}>{name?.slice(0, 1)}</T>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 4 / 5,
    backgroundColor: colors.surfaceHigh,
  },
  heartOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
