import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, MapPin, X } from 'lucide-react';
import api from '../services/api';

// Fix Leaflet's default marker icon paths (broken by bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const IRAN_CENTER = [35.6892, 51.389];
const DEFAULT_ZOOM = 12;

// Internal: listens for map clicks and updates position
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Internal: search dropdown rendered above the map
function SearchBox({ mapRef, onPick, currentLat, currentLng }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  function handleChange(e) {
    const val = e.target.value;
    setTerm(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ term: val });
        if (currentLat) params.set('lat', currentLat);
        if (currentLng) params.set('lng', currentLng);
        const { data } = await api.get(`/map/search?${params}`);
        setResults(data.items?.slice(0, 6) || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }

  function pick(item) {
    const lat = item.location?.y;
    const lng = item.location?.x;
    if (!lat || !lng) return;
    setTerm(item.title);
    setResults([]);
    onPick(lat, lng);
    mapRef.current?.flyTo([lat, lng], 16, { duration: 0.8 });
  }

  return (
    <div className="absolute top-3 right-3 left-3 z-[1000]">
      <div className="relative">
        <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={term}
          onChange={handleChange}
          placeholder="جستجوی آدرس یا مکان..."
          className="w-full pr-8 pl-8 py-2 text-sm rounded-xl border border-gray-200 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          dir="rtl"
        />
        {term && (
          <button
            type="button"
            onClick={() => { setTerm(''); setResults([]); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {(results.length > 0 || loading) && (
        <div className="mt-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden" dir="rtl">
          {loading && <p className="text-xs text-gray-400 px-3 py-2">در حال جستجو...</p>}
          {results.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(item)}
              className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-start gap-2 border-b border-gray-50 last:border-0"
            >
              <MapPin size={13} className="text-primary-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-gray-800">{item.title}</p>
                {item.address && <p className="text-xs text-gray-400 mt-0.5">{item.address}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * LocationPicker — interactive map for venue owners to set their location.
 *
 * Props:
 *   lat, lng          — current saved coordinates (numbers or strings)
 *   onChange(patch)   — called with { lat, lng, address, neighborhood, city }
 *   height            — map height in px (default 340)
 *   readOnly          — if true, shows a static pin with no interaction
 */
export default function LocationPicker({ lat, lng, onChange, height = 340, readOnly = false }) {
  const [pos, setPos] = useState(
    lat && lng ? [Number(lat), Number(lng)] : null
  );
  const [address, setAddress] = useState('');
  const [reverseLoading, setReverseLoading] = useState(false);
  const mapRef = useRef(null);

  // Sync external prop changes (e.g. form reset)
  useEffect(() => {
    if (lat && lng) setPos([Number(lat), Number(lng)]);
  }, [lat, lng]);

  const reverseGeocode = useCallback(async (la, ln) => {
    setReverseLoading(true);
    try {
      const { data } = await api.get(`/map/reverse?lat=${la}&lng=${ln}`);
      const addr = data.formatted_address || '';
      setAddress(addr);
      onChange?.({ lat: la, lng: ln, address: addr, neighborhood: data.neighbourhood || '', city: data.city || '' });
    } catch {
      onChange?.({ lat: la, lng: ln, address: '', neighborhood: '', city: '' });
    } finally {
      setReverseLoading(false);
    }
  }, [onChange]);

  function handlePick(la, ln) {
    if (readOnly) return;
    setPos([la, ln]);
    reverseGeocode(la, ln);
  }

  const center = pos || IRAN_CENTER;
  const zoom = pos ? 15 : DEFAULT_ZOOM;

  return (
    <div className="space-y-2">
      <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
        {!readOnly && (
          <SearchBox
            mapRef={mapRef}
            onPick={handlePick}
            currentLat={pos?.[0]}
            currentLng={pos?.[1]}
          />
        )}

        <div className="w-full h-full [&_.leaflet-tile-pane]:grayscale [&_.leaflet-tile-pane]:contrast-[1.05]">
          <MapContainer
            center={center}
            zoom={zoom}
            scrollWheelZoom
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {!readOnly && <ClickHandler onPick={handlePick} />}
            {pos && (
              <Marker
                position={pos}
                draggable={!readOnly}
                eventHandlers={readOnly ? {} : {
                  dragend(e) {
                    const { lat: la, lng: ln } = e.target.getLatLng();
                    handlePick(la, ln);
                  },
                }}
              />
            )}
          </MapContainer>
        </div>

        {!pos && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 shadow text-sm text-gray-600 flex items-center gap-2">
              <MapPin size={15} className="text-primary-500" />
              روی نقشه کلیک کنید تا موقعیت مجموعه را مشخص کنید
            </div>
          </div>
        )}
      </div>

      {pos && (
        <div className="flex items-start gap-2 text-xs text-gray-500 px-1" dir="rtl">
          <MapPin size={13} className="text-primary-500 mt-0.5 flex-shrink-0" />
          <span>
            {reverseLoading ? 'در حال دریافت آدرس...' : (address || `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}`)}
          </span>
        </div>
      )}
    </div>
  );
}
