import { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { StatTile } from '../../components/PanelUI';
import { Button, Card, EmptyState, Icon, Input, Loading, Muted, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

function Stars({ rating }) {
  return (
    <Row style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={12} color={n <= rating ? colors.gold300 : colors.border} />
      ))}
    </Row>
  );
}

export default function VenueFeedbackScreen() {
  const { user } = useAuth();
  const { t, n, date } = useI18n();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [openReplyId, setOpenReplyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get(`/reviews/venue/${user.venueId}`);
      setData(res);
    } catch {
      setData({ reviews: [], averageRating: 0, reviewCount: 0 });
    }
  }, [user.venueId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return <Loading />;

  async function sendReply(reviewId) {
    const reply = replyDrafts[reviewId];
    if (!reply) return;
    try {
      await api.patch(`/reviews/venue/${user.venueId}/${reviewId}/reply`, { reply });
      toast.success(t('replySaved'));
      setOpenReplyId(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Row style={{ gap: 10, marginBottom: 14 }}>
        <StatTile icon="star" label={t('averageRating')} value={Number(data.averageRating || 0).toFixed(1)} />
        <StatTile icon="message-circle" label={t('totalReviews')} value={n(data.reviewCount || 0)} />
      </Row>

      {(!data.reviews || data.reviews.length === 0) ? (
        <EmptyState icon="star" title={t('noFeedback')} subtitle={t('noFeedbackHint')} />
      ) : (
        data.reviews.map((review) => (
          <Card key={review.id} style={{ marginBottom: 10 }}>
            <Row between>
              <T style={{ fontFamily: fonts.medium, fontSize: 13 }}>{review.userName}</T>
              <Muted style={{ fontSize: 11 }}>{date(review.createdAt)}</Muted>
            </Row>
            <View style={{ marginTop: 6 }}>
              <Stars rating={review.rating} />
            </View>
            {review.comment ? (
              <T style={{ fontSize: 13, marginTop: 8 }}>{review.comment}</T>
            ) : null}

            {review.venueReply ? (
              <View style={{ marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceHigh }}>
                <Muted style={{ fontSize: 10, marginBottom: 4 }}>{t('replyToReview')}</Muted>
                <T style={{ fontSize: 12 }}>{review.venueReply}</T>
              </View>
            ) : openReplyId === review.id ? (
              <View style={{ marginTop: 10 }}>
                <Input
                  placeholder={t('replyPlaceholder')}
                  value={replyDrafts[review.id] || ''}
                  onChangeText={(v) => setReplyDrafts((d) => ({ ...d, [review.id]: v }))}
                  multiline
                  numberOfLines={2}
                  style={{ marginBottom: 8 }}
                />
                <Button small title={t('sendReply')} onPress={() => sendReply(review.id)} />
              </View>
            ) : (
              <Button
                small
                variant="ghost"
                icon="corner-up-left"
                title={t('replyToReview')}
                onPress={() => setOpenReplyId(review.id)}
                style={{ marginTop: 10, alignSelf: 'flex-start' }}
              />
            )}
          </Card>
        ))
      )}
    </ScrollView>
  );
}
