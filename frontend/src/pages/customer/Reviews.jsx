import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Star, Coffee } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { resolveImageUrl } from '../../components/VenueCards';
import { useLanguage } from '../../context/LanguageContext';

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={n <= value ? 'text-ink' : 'text-gray-300'}
        >
          <Star size={22} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export default function Reviews() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const venueId = searchParams.get('venueId');

  const [reviews, setReviews] = useState([]);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  async function refresh() {
    const { data } = await api.get('/reviews/mine');
    setReviews(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  const existingReviewForOrder = reviews.find((r) => r.orderId === orderId);
  const showCreateForm = orderId && venueId && !existingReviewForOrder;

  async function submitReview(e) {
    e.preventDefault();
    await api.post('/reviews', { orderId, venueId, rating: newRating, comment: newComment });
    setNewComment('');
    setNewRating(5);
    refresh();
  }

  function startEdit(review) {
    setEditingId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  }

  async function saveEdit(id) {
    await api.patch(`/reviews/${id}`, { rating: editRating, comment: editComment });
    setEditingId(null);
    refresh();
  }

  async function removeReview(id) {
    await api.delete(`/reviews/${id}`);
    refresh();
  }

  return (
    <div className="space-y-6 max-w-lg">
      {showCreateForm && (
        <Card>
          <h3 className="font-semibold text-gray-800 mb-3">{t('reviews.writeForOrder')}</h3>
          <form onSubmit={submitReview} className="space-y-3">
            <StarPicker value={newRating} onChange={setNewRating} />
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('reviews.commentPlaceholder')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <Button type="submit">{t('reviews.submit')}</Button>
          </form>
        </Card>
      )}

      <div>
        <h3 className="font-semibold text-gray-800 mb-3">{t('reviews.myReviews')}</h3>
        {reviews.length === 0 && <p className="text-gray-500 text-sm">{t('reviews.none')}</p>}
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              {editingId === review.id ? (
                <div className="space-y-2">
                  <StarPicker value={editRating} onChange={setEditRating} />
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => saveEdit(review.id)}>{t('account.save')}</Button>
                    <Button variant="ghost" onClick={() => setEditingId(null)}>
                      {t('account.cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-100">
                    <Link
                      to={`/menu/${review.venueId}`}
                      className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center"
                    >
                      {review.venueLogoUrl || review.venueCoverImageUrl ? (
                        <img
                          src={resolveImageUrl(review.venueLogoUrl || review.venueCoverImageUrl)}
                          alt={review.venueName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Coffee size={18} className="text-gray-400" />
                      )}
                    </Link>
                    <div className="min-w-0">
                      <Link to={`/menu/${review.venueId}`} className="font-bold text-ink text-sm hover:underline">
                        {review.venueName || t('reviews.deletedVenue')}
                      </Link>
                      {review.orderCreatedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t('reviews.orderPrefix')} {new Date(review.orderCreatedAt).toLocaleDateString('fa-IR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {review.orderItems?.length > 0 && (
                    <p className="text-xs text-gray-500 mb-2">
                      {review.orderItems.map((i) => `${i.name} ×${i.quantity}`).join('، ')}
                    </p>
                  )}

                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((n) => (
                          <Star key={n} size={14} fill={n <= review.rating ? 'currentColor' : 'none'} className={n <= review.rating ? 'text-ink' : 'text-gray-300'} />
                        ))}
                      </div>
                      {review.comment && <p className="text-sm text-gray-700 mt-1">{review.comment}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString('fa-IR')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => startEdit(review)}>
                        {t('account.edit')}
                      </Button>
                      <Button variant="danger" onClick={() => removeReview(review.id)}>
                        {t('account.delete')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
