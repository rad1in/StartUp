import { useEffect, useState } from 'react';
import { Star, User, MessageCircle, CornerDownLeft } from 'lucide-react';
import api from '../services/api';
import Card from './Card';

function Stars({ rating }) {
  return (
    <span className="inline-flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={13}
          className={n <= rating ? 'text-accent-500' : 'text-gray-200'}
          fill="currentColor"
        />
      ))}
    </span>
  );
}

// Public reviews under the menu — average summary + individual comments with
// the venue's replies. Submitting stays in the account area (needs a served
// order), so a hint tells customers how to leave one.
export default function ReviewsSection({ venueId }) {
  const [data, setData] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    api
      .get(`/reviews/venue/${venueId}`)
      .then(({ data }) => setData(data))
      .catch(() => setData({ reviews: [], averageRating: 0, reviewCount: 0 }));
  }, [venueId]);

  if (!data || data.reviewCount === 0) return null;

  const visible = showAll ? data.reviews : data.reviews.slice(0, 4);

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 font-extrabold text-ink mb-4">
        <span className="section-tick" style={{ height: '1.1rem' }} />
        نظرات مشتریان
      </h2>

      <Card className="rounded-3xl p-5 space-y-4">
        {/* Summary row */}
        <div className="flex items-center gap-4 pb-4 border-b border-dashed border-ink/10">
          <span className="text-4xl font-black text-ink leading-none">
            {Number(data.averageRating).toFixed(1)}
          </span>
          <div>
            <Stars rating={Math.round(data.averageRating)} />
            <p className="text-xs text-ink/50 mt-1">
              بر اساس {data.reviewCount.toLocaleString('fa-IR')} نظر ثبت‌شده
            </p>
          </div>
        </div>

        {/* Comments */}
        <ul className="space-y-5">
          {visible.map((review) => (
            <li key={review.id} className="flex gap-3">
              <span className="w-10 h-10 rounded-full bg-surface-3 text-ink/40 flex items-center justify-center shrink-0">
                <User size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-sm text-ink">{review.userName || 'مشتری'}</span>
                  <Stars rating={review.rating} />
                  <span className="text-[11px] text-ink/35">
                    {new Date(review.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-sm text-ink/70 leading-relaxed mt-1.5">{review.comment}</p>
                )}
                {review.venueReply && (
                  <div className="mt-2.5 bg-accent-50/70 border border-accent-200/60 rounded-xl px-3 py-2.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold text-accent-800 mb-1">
                      <CornerDownLeft size={11} />
                      پاسخ کافه
                    </p>
                    <p className="text-sm text-ink/70 leading-relaxed">{review.venueReply}</p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>

        {data.reviews.length > 4 && !showAll && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full text-sm font-bold text-accent-700 hover:text-accent-600 transition-colors py-1"
          >
            نمایش {(data.reviews.length - 4).toLocaleString('fa-IR')} نظر دیگر
          </button>
        )}

        <p className="flex items-center gap-1.5 text-xs text-ink/40 pt-1 border-t border-dashed border-ink/10">
          <MessageCircle size={13} className="shrink-0" />
          بعد از سرو شدن سفارش، می‌توانید از بخش «حساب کاربری، سفارش‌ها» نظر خودتان را ثبت کنید.
        </p>
      </Card>
    </section>
  );
}
