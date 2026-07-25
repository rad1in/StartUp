import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft } from 'lucide-react';
import { useVenueOccupancy } from '../hooks/useVenueOccupancy';
import { RatingLabel } from './VenueCards';
import OccupancyBadge from './OccupancyBadge';
import { useLanguage } from '../context/LanguageContext';

// Circle radius/opacity scale with crowd density — monochrome only (ink at
// varying alpha), never a hue, consistent with the rest of the design system.
const MARKER_STYLE = {
  quiet: { radius: 8, fillOpacity: 0.35 },
  moderate: { radius: 10, fillOpacity: 0.6 },
  busy: { radius: 12, fillOpacity: 0.9 },
  unknown: { radius: 7, fillOpacity: 0.2 },
};

function VenueMarker({ venue, onSelect }) {
  const { t } = useLanguage();
  const occupancy = useVenueOccupancy(venue.id, venue.occupancy);
  const style = MARKER_STYLE[occupancy?.level] || MARKER_STYLE.unknown;

  return (
    <CircleMarker
      center={[venue.lat, venue.lng]}
      radius={style.radius}
      pathOptions={{ color: '#1D1B16', weight: 1.5, fillColor: '#1D1B16', fillOpacity: style.fillOpacity }}
    >
      <Popup>
        <div className="text-right min-w-[160px]" dir="rtl">
          <p className="font-bold text-ink mb-1">{venue.name}</p>
          <div className="text-xs flex items-center gap-2 mb-2">
            <RatingLabel averageRating={venue.averageRating} reviewCount={venue.reviewCount} />
            <OccupancyBadge occupancy={occupancy} />
          </div>
          <button
            type="button"
            onClick={() => onSelect(venue)}
            className="text-xs font-bold text-ink underline hover:opacity-70"
          >
            <span className="flex items-center gap-1">{t('discoveryMap.viewMenu')} <ArrowLeft size={12} /></span>
          </button>
        </div>
      </Popup>
    </CircleMarker>
  );
}

export default function DiscoveryMap({ venues, center, onSelectVenue, height = 420 }) {
  const withCoords = venues.filter((v) => v.lat && v.lng);
  if (withCoords.length === 0) return null;

  const mapCenter = center || [withCoords[0].lat, withCoords[0].lng];

  return (
    <div
      className="rounded-3xl overflow-hidden border border-white/50 shadow-[0_8px_30px_rgba(20,18,16,0.08)]"
      style={{ height }}
    >
      {/* Grayscale filter keeps the OSM tiles consistent with the monochrome design. */}
      <div className="w-full h-full [&_.leaflet-tile-pane]:grayscale [&_.leaflet-tile-pane]:contrast-[1.05]">
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {withCoords.map((venue) => (
            <VenueMarker key={venue.id} venue={venue} onSelect={onSelectVenue} />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
