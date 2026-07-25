import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../services/api';
import { getCurrentPosition } from '../services/geolocation';
import { DEFAULT_CITY, findPopularCityByName } from '../constants/popularCities';

const STORAGE_KEY = 'selectedCity';

export const CityContext = createContext(null);

// Global "which city am I browsing" state — auto-detected from the browser's
// geolocation on first visit (via reverse geocoding), then persisted so later
// visits and manual picks from the header stick.
export function CityProvider({ children }) {
  const [city, setCityState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_CITY;
    } catch {
      return DEFAULT_CITY;
    }
  });
  const hadSavedCity = useRef(Boolean(localStorage.getItem(STORAGE_KEY)));

  function setCity(next) {
    setCityState(next);
    hadSavedCity.current = true;
  }

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(city));
    } catch {
      /* storage unavailable — selection just won't persist */
    }
  }, [city]);

  // Auto-detect once, only if the user has never picked a city themselves.
  useEffect(() => {
    if (hadSavedCity.current) return;
    let cancelled = false;

    (async () => {
      try {
        const pos = await getCurrentPosition({ enableHighAccuracy: false, timeout: 8000 });
        const { data } = await api.get(`/map/reverse?lat=${pos.lat}&lng=${pos.lng}`);
        const detected = findPopularCityByName(data?.city);
        if (!cancelled && detected && !hadSavedCity.current) {
          setCityState(detected);
        }
      } catch {
        // Geolocation denied/unavailable, or city not in our known list —
        // silently keep the Tehran default.
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ city, setCity }), [city]);
  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const ctx = useContext(CityContext);
  if (!ctx) throw new Error('useCity must be used within CityProvider');
  return ctx;
}
