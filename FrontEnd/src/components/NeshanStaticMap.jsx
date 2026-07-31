import { useState } from 'react';
import { MapPin } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function NeshanStaticMap({
  lat,
  lng,
  zoom = 14,
  width = 600,
  height = 280,
  style = 'light',
  marker = 'red',
  className = '',
  alt = 'نقشه موقعیت',
}) {
  const [error, setError] = useState(false);

  if (!lat || !lng) return null;

  const params = new URLSearchParams({ lat, lng, zoom, width, height, style });
  if (marker) params.set('marker', marker);
  const src = `${API_BASE}/map/static?${params.toString()}`;

  if (error) {
    return (
      <div
        className={`flex items-center justify-center gap-2 bg-gray-100 text-gray-400 text-sm rounded-2xl ${className}`}
        style={{ height }}
      >
        <MapPin size={16} />
        <span>نقشه در دسترس نیست</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`w-full object-cover rounded-2xl ${className}`}
      style={{ height }}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
