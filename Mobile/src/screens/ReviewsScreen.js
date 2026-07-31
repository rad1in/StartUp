import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Button, Card, EmptyState, Icon, Input, Loading, Muted, Row, T } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

function StarPicker({ value, onChange, size = 22 }) {
  return (
    <Row style={{ gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange?.(n)} hitSlop={6} disabled={!onChange}>
          <Icon name="star" size={size} color={n <= value ? colors.gold300 : colors.border} />
        </Pressable>
      ))}
    </Row>
  );
}

export default function ReviewsScreen() {
  const { orderId, venueId } = useLocalSearchParams();
  const router = useRouter();
  const { t, date } = useI18n();
  const toast = useToast();
  const [reviews, setReviews] = useState(null);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/reviews/mine');
      setReviews(data);
    } catch {
      setReviews([]);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (reviews === null) return <Loading />;

  const existingForOrder = orderId ? reviews.find((r) => r.orderId === orderId) : null;
  const showCreateForm = orderId && venueId && !existingForOrder;

  async function submitReview() {
    setSubmitting(true);
    try {
      await api.post('/reviews', { orderId, venueId, rating: newRating, comment: newComment || undefined });
      setNewComment('');
      setNewRating(5);
      toast.success(t('reviewSaved'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(review) {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  }

  async function saveEdit(id) {
    try {
      await api.patch(`/reviews/${id}`, { rating: editRating, comment: editComment });
      setEditingId(null);
      toast.success(t('reviewSaved'));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  function confirmDelete(id) {
    Alert.alert(t('deleteReview'), t('deleteReviewConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          await api.delete(`/reviews/${id}`);
          toast.success(t('reviewDeleted'));
          refresh();
        },
      },
    ]);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {showCreateForm && (
        <Card gold style={{ marginBottom: 20 }}>
          <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('submitReviewTitle')}</T>
          <StarPicker value={newRating} onChange={setNewRating} />
          <Input
            placeholder={t('reviewCommentPlaceholder')}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            numberOfLines={3}
            style={{ marginTop: 12, marginBottom: 12 }}
          />
          <Button title={submitting ? t('loading') : t('submitReview')} onPress={submitReview} disabled={submitting} />
        </Card>
      )}

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('myReviews')}</T>

      {reviews.length === 0 ? (
        <EmptyState icon="star" title={t('noReviewsYet')} subtitle={t('noReviewsYetHint')} />
      ) : (
        reviews.map((review) => (
          <Card key={review.id} style={{ marginBottom: 12 }}>
            {editingId === review.id ? (
              <View style={{ gap: 10 }}>
                <StarPicker value={editRating} onChange={setEditRating} />
                <Input value={editComment} onChangeText={setEditComment} multiline numberOfLines={3} />
                <Row style={{ gap: 8 }}>
                  <Button small title={t('save')} onPress={() => saveEdit(review.id)} style={{ flex: 1 }} />
                  <Button small variant="ghost" title={t('cancel')} onPress={() => setEditingId(null)} style={{ flex: 1 }} />
                </Row>
              </View>
            ) : (
              <View>
                <Pressable
                  onPress={() => router.push(`/venue/${review.venueId}`)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}
                >
                  <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {review.venueLogoUrl || review.venueCoverImageUrl ? (
                      <Image
                        source={{ uri: imageUrl(review.venueLogoUrl || review.venueCoverImageUrl) }}
                        style={{ width: '100%', height: '100%' }}
                      />
                    ) : (
                      <Icon name="coffee" size={16} color={colors.gold300} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: fonts.bold, fontSize: 14 }} numberOfLines={1}>
                      {review.venueName || t('deletedVenue')}
                    </T>
                    {!!review.orderCreatedAt && (
                      <Muted style={{ fontSize: 11, marginTop: 1 }}>{date(review.orderCreatedAt)}</Muted>
                    )}
                  </View>
                </Pressable>

                {review.orderItems?.length > 0 && (
                  <Muted style={{ fontSize: 12, marginBottom: 8 }}>
                    {review.orderItems.map((i) => `${i.name} ×${i.quantity}`).join('، ')}
                  </Muted>
                )}

                <Row between>
                  <StarPicker value={review.rating} size={14} />
                  <Muted style={{ fontSize: 11 }}>{date(review.createdAt)}</Muted>
                </Row>
                {review.comment ? (
                  <T style={{ fontSize: 13, marginTop: 8 }}>{review.comment}</T>
                ) : null}
                <Row style={{ gap: 16, marginTop: 10 }}>
                  <Pressable onPress={() => startEdit(review)}>
                    <T style={{ fontSize: 12, color: colors.gold300, fontFamily: fonts.medium }}>{t('editReview')}</T>
                  </Pressable>
                  <Pressable onPress={() => confirmDelete(review.id)}>
                    <T style={{ fontSize: 12, color: colors.red, fontFamily: fonts.medium }}>{t('deleteReview')}</T>
                  </Pressable>
                </Row>
              </View>
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
