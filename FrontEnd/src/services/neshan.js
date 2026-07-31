// Thin wrapper around Neshan's map/geocoding APIs (https://platform.neshan.org/docs/).
// The actual nearby-venue search is done by our own backend (/api/venues/nearby);
// this module is only responsible for map tiles/markers on the frontend.

const NESHAN_API_KEY = import.meta.env.VITE_NESHAN_API_KEY || '';

export const NESHAN_TILE_URL = `https://api.neshan.org/v2/static?key=${NESHAN_API_KEY}`;

export function staticMapUrl({ lat, lng, zoom = 15, width = 600, height = 300 }) {
  return `https://api.neshan.org/v4/static?key=${NESHAN_API_KEY}&type=standard-night&center=${lat},${lng}&zoom=${zoom}&width=${width}&height=${height}&marker=${lat},${lng}`;
}

export function isNeshanConfigured() {
  return Boolean(NESHAN_API_KEY);
}
