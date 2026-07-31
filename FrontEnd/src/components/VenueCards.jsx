import { Star, MapPin } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import OccupancyBadge from './OccupancyBadge';
import { useVenueOccupancy } from '../hooks/useVenueOccupancy';
import { useLanguage } from '../context/LanguageContext';

const FILE_BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function resolveImageUrl(url) {
  if (!url) return null;
  return /^https?:\/\//.test(url) ? url : `${FILE_BASE_URL}${url}`;
}

// Haversine formula (meters) — mirrors the backend's findNearby query, used
// to rank/filter the venue grid client-side once we have a location fix.
export function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// `n` is the locale-aware number formatter from useLanguage() — passed in
// rather than read here so this stays a plain function usable outside React.
export function priceLabel(averagePrice, t, n) {
  if (!averagePrice) return null;
  const rounded = Math.round(averagePrice / 10000) * 10000;
  return `${t('venueCard.about')} ${n(rounded)} ${t('venueCard.toman')}`;
}

export function RatingLabel({ averageRating, reviewCount }) {
  const { t, n } = useLanguage();
  if (!averageRating) return <span className="text-ink/50">{t('venueCard.new')}</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={12} fill="currentColor" className="text-accent-500" />
      <span className="font-bold tabular-nums">{Number(averageRating).toFixed(1)}</span>
      <span className="text-ink/40 tabular-nums">({n(reviewCount)})</span>
    </span>
  );
}

export function NearbyCard({ venue, onClick }) {
  const { t, n } = useLanguage();
  const image = resolveImageUrl(venue.coverImageUrl || venue.logoUrl);
  const occupancy = useVenueOccupancy(venue.id, venue.occupancy);
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass hover-lift flex items-center gap-3.5 rounded-3xl p-3.5 flex-1 min-w-[230px] text-start relative hover:border-accent-300/40"
    >
      {venue.distanceMeters !== undefined && (
        <span className="absolute top-2.5 end-2.5 bg-gradient-to-b from-accent-400 to-accent-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-accent-glow tabular-nums">
          {n(Math.round(venue.distanceMeters))} {t('venueCard.metersSuffix')}
        </span>
      )}
      {!!venue.isFeatured && (
        <span className="absolute top-2.5 start-2.5 bg-ink text-amber-400 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-400/40">
          <Star size={10} fill="currentColor" /> {t('venueCard.featured')}
        </span>
      )}
      {image ? (
        <img
          src={image}
          alt={venue.name}
          className="w-[70px] h-[70px] rounded-2xl object-cover border-2 border-white/70 shadow-soft flex-shrink-0"
        />
      ) : (
        <div className="w-[70px] h-[70px] rounded-2xl bg-surface-3 flex-shrink-0" />
      )}
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-black text-ink text-[15px] truncate">{venue.name}</span>
        <span className="text-xs flex items-center gap-2">
          <RatingLabel averageRating={venue.averageRating} reviewCount={venue.reviewCount} />
          <OccupancyBadge occupancy={occupancy} />
        </span>
        <span className="text-xs text-ink/50 truncate">{venue.neighborhood || venue.address}</span>
      </div>
    </button>
  );
}

export function VenueCard({ venue, onClick }) {
  const { t, n } = useLanguage();
  const image = resolveImageUrl(venue.coverImageUrl);
  const price = priceLabel(venue.averagePrice, t, n);
  const occupancy = useVenueOccupancy(venue.id, venue.occupancy);
  return (
    <Card interactive onClick={onClick} className="p-0 overflow-hidden flex flex-col group rounded-[1.75rem]">
      <div className="relative h-64 bg-surface-3 overflow-hidden">
        {image && (
          <img
            src={image}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform duration-[900ms] ease-spring group-hover:scale-[1.12]"
          />
        )}
        {/* Deeper scrim than before: the venue name is now display-sized and
            needs to hold up over bright photos. */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <span className="absolute top-3.5 end-3.5 glass-strong px-3 py-1.5 rounded-full text-xs font-bold shadow-soft flex items-center gap-2">
          <RatingLabel averageRating={venue.averageRating} reviewCount={venue.reviewCount} />
          <OccupancyBadge occupancy={occupancy} />
        </span>
        <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-3">
          <h3 className="font-black text-2xl leading-tight text-white drop-shadow-md min-w-0 truncate">{venue.name}</h3>
          {venue.neighborhood && (
            <span className="glass-clear px-2.5 py-1 rounded-full text-[11px] font-bold text-white shrink-0">
              {venue.neighborhood}
            </span>
          )}
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-3">
        {venue.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {venue.tags.map((tag) => (
              <span
                key={tag}
                className="bg-accent-50 border border-accent-200/70 text-accent-800 text-[11px] font-bold px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-ink/50 flex items-center gap-1.5">
          <MapPin size={13} className="text-accent-500 shrink-0" />
          <span className="truncate">{venue.address}</span>
        </p>
        {venue.description && <p className="text-sm text-ink/70 flex-1 leading-relaxed line-clamp-2">{venue.description}</p>}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-black/5">
        {price ? <span className="font-black text-accent-700 text-sm tabular-nums">{price}</span> : <span />}
        <Button onClick={onClick} className="shrink-0">{t('venueCard.viewMenu')}</Button>
      </div>
    </Card>
  );
}
