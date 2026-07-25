import { Star, MapPin } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import OccupancyBadge from './OccupancyBadge';
import { useVenueOccupancy } from '../hooks/useVenueOccupancy';

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

export function priceLabel(averagePrice) {
  if (!averagePrice) return null;
  const rounded = Math.round(averagePrice / 10000) * 10000;
  return `حدود ${rounded.toLocaleString('fa-IR')} تومان`;
}

export function RatingLabel({ averageRating, reviewCount }) {
  if (!averageRating) return <span className="text-ink/50">تازه‌کار</span>;
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={12} fill="currentColor" className="text-accent-500" />
      <span className="font-bold">{Number(averageRating).toFixed(1)}</span>
      <span className="text-ink/40">({reviewCount.toLocaleString('fa-IR')})</span>
    </span>
  );
}

export function NearbyCard({ venue, onClick }) {
  const image = resolveImageUrl(venue.coverImageUrl || venue.logoUrl);
  const occupancy = useVenueOccupancy(venue.id, venue.occupancy);
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass flex items-center gap-3 rounded-2xl p-3 flex-1 min-w-[230px] text-right relative transition-all duration-300 hover:shadow-[0_18px_45px_rgba(20,18,16,0.12)] hover:-translate-y-1"
    >
      {venue.distanceMeters !== undefined && (
        <span className="absolute top-2 left-2 bg-gradient-to-b from-accent-400 to-accent-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-accent-glow">
          {Math.round(venue.distanceMeters).toLocaleString('fa-IR')} متر
        </span>
      )}
      {!!venue.isFeatured && (
        <span className="absolute top-2 right-2 bg-ink text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-400/40">
          <Star size={10} fill="currentColor" /> ویژه
        </span>
      )}
      {image ? (
        <img
          src={image}
          alt={venue.name}
          className="w-16 h-16 rounded-2xl object-cover border-2 border-white/70 shadow-sm flex-shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-surface-3 flex-shrink-0" />
      )}
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="font-bold text-ink truncate">{venue.name}</span>
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
  const image = resolveImageUrl(venue.coverImageUrl);
  const price = priceLabel(venue.averagePrice);
  const occupancy = useVenueOccupancy(venue.id, venue.occupancy);
  return (
    <Card interactive onClick={onClick} className="p-0 overflow-hidden flex flex-col group rounded-3xl">
      <div className="relative h-52 bg-surface-3 overflow-hidden">
        {image && (
          <img
            src={image}
            alt={venue.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        )}
        {/* Bottom gradient scrim so the venue name reads over any photo. */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
        <span className="absolute top-3 right-3 glass-strong px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-2">
          <RatingLabel averageRating={venue.averageRating} reviewCount={venue.reviewCount} />
          <OccupancyBadge occupancy={occupancy} />
        </span>
        {venue.neighborhood && (
          <span className="absolute bottom-3 left-3 glass-clear px-2.5 py-1 rounded-full text-[11px] font-medium text-white">
            {venue.neighborhood}
          </span>
        )}
        <h3 className="absolute bottom-3 right-3 font-black text-lg text-white drop-shadow-sm">{venue.name}</h3>
      </div>
      <div className="p-5 flex-1 flex flex-col gap-2.5">
        {venue.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {venue.tags.map((tag) => (
              <span key={tag} className="bg-accent-50 border border-accent-200/70 text-accent-800 text-xs px-2.5 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="text-sm text-ink/50 flex items-center gap-1"><MapPin size={13} className="text-accent-500 shrink-0" />{venue.address}</p>
        {venue.description && <p className="text-sm text-ink/70 flex-1 leading-relaxed">{venue.description}</p>}
      </div>
      <div className="flex items-center justify-between px-5 py-4 border-t border-black/5">
        {price ? <span className="font-bold text-accent-700 text-sm">{price}</span> : <span />}
        <Button onClick={onClick}>مشاهده منو</Button>
      </div>
    </Card>
  );
}
