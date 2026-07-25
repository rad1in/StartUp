import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';

export default function Feedback() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [sentiment, setSentiment] = useState([]);
  const [replyDrafts, setReplyDrafts] = useState({});

  async function refresh() {
    const [{ data: reviewData }, { data: sentimentData }] = await Promise.all([
      api.get(`/reviews/venue/${venueId}`),
      api.get(`/reviews/venue/${venueId}/sentiment`),
    ]);
    setReviews(reviewData.reviews);
    setAverageRating(reviewData.averageRating);
    setSentiment(sentimentData);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function submitReply(review) {
    const reply = replyDrafts[review.id];
    if (!reply) return;
    await api.patch(`/reviews/venue/${venueId}/${review.id}/reply`, { reply });
    refresh();
  }

  if (!venueId) return <p className="text-gray-500">{t('common.noVenueLinked')}</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="font-semibold text-gray-800 mb-2">{t('venue.feedback.averageRating')}</h3>
        <p className="text-3xl font-bold text-primary-700">{averageRating.toFixed(1)} / ۵</p>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.feedback.monthlyTrend')}</h3>
        {sentiment.length === 0 && <p className="text-gray-500 text-sm">{t('common.noDataToShow')}</p>}
        <div className="space-y-1">
          {sentiment.map((row) => (
            <div key={row.month} className="flex items-center justify-between text-sm">
              <span>{row.month}</span>
              <span className="text-gray-600">
                {row.averageRating.toFixed(1)} / ۵ ({row.reviewCount} {t('venue.feedback.reviewsSuffix')})
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.feedback.customerReviews')}</h3>
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <p className="text-ink">
                {Array.from({ length: review.rating }, (_, i) => <Star key={i} size={13} fill="currentColor" className="inline text-ink" />)}
                {Array.from({ length: 5 - review.rating }, (_, i) => <Star key={i} size={13} fill="none" className="inline text-gray-300" />)}
              </p>
              {review.comment && <p className="text-sm text-gray-700 mt-1">{review.comment}</p>}
              <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString('fa-IR')}</p>

              {review.venueReply ? (
                <div className="mt-2 bg-gray-50 rounded-lg p-2">
                  <p className="text-xs font-semibold text-gray-600">{t('venue.feedback.venueReply')}</p>
                  <p className="text-sm text-gray-700">{review.venueReply}</p>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder={t('venue.feedback.replyPlaceholder')}
                    value={replyDrafts[review.id] || ''}
                    onChange={(e) => setReplyDrafts({ ...replyDrafts, [review.id]: e.target.value })}
                  />
                  <Button variant="secondary" onClick={() => submitReply(review)}>
                    {t('venue.feedback.sendReply')}
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
