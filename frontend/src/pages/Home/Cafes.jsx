import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCity } from '../../context/CityContext';
import api from '../../services/api';
import Card from '../../components/Card';
import SearchBar from '../../components/SearchBar';
import { VenueCard, distanceMeters } from '../../components/VenueCards';
import DiscoveryMap from '../../components/DiscoveryMap';
import { useLanguage } from '../../context/LanguageContext';

const MAX_DISTANCE_METERS = 5000;

export default function Cafes() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { position } = useGeolocation();
  const { city } = useCity();
  const [searchParams] = useSearchParams();
  const [allVenues, setAllVenues] = useState([]);

  const [search, setSearch] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(MAX_DISTANCE_METERS);
  const [neighborhoodQuery, setNeighborhoodQuery] = useState('');
  const [activeNeighborhoods, setActiveNeighborhoods] = useState([]);
  const [activeTag, setActiveTag] = useState(searchParams.get('tag') || 'all');
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    api.get('/venues').then(({ data }) => setAllVenues(data));
  }, []);

  // City scoping comes from the global header picker.
  const activeCity = city?.name || '';

  const cityVenues = useMemo(
    () => (activeCity ? allVenues.filter((v) => v.city === activeCity) : allVenues),
    [allVenues, activeCity]
  );

  // Changing city invalidates the neighborhood selection.
  useEffect(() => {
    setActiveNeighborhoods([]);
  }, [activeCity]);

  const neighborhoods = useMemo(
    () => [...new Set(cityVenues.map((v) => v.neighborhood).filter(Boolean))].sort(),
    [cityVenues]
  );
  const tags = useMemo(() => [...new Set(cityVenues.flatMap((v) => v.tags || []))].sort(), [cityVenues]);
  const filteredNeighborhoods = neighborhoods.filter((n) => n.includes(neighborhoodQuery.trim()));

  const visibleVenues = useMemo(() => {
    const term = search.trim().toLowerCase();
    return cityVenues.filter((venue) => {
      if (term) {
        const text = `${venue.name} ${venue.description || ''}`.toLowerCase();
        if (!text.includes(term)) return false;
      }
      if (minRating > 0 && (venue.averageRating || 0) < minRating) return false;
      if (position && distanceMeters(position, venue) > maxDistance) return false;
      if (activeNeighborhoods.length > 0 && !activeNeighborhoods.includes(venue.neighborhood)) return false;
      if (activeTag !== 'all' && !(venue.tags || []).includes(activeTag)) return false;
      return true;
    });
  }, [cityVenues, search, minRating, maxDistance, position, activeNeighborhoods, activeTag]);

  function toggleNeighborhood(n) {
    setActiveNeighborhoods((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  return (
    <div className="space-y-8">
      <header className="text-center pt-2 animate-fade-up">
        <p className="inline-flex items-center gap-1.5 glass-clear text-ink/70 text-xs font-medium px-3 py-1 rounded-full mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
          {visibleVenues.length.toLocaleString('fa-IR')} {t('cafes.countLabel')}
        </p>
        <h1 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
          {t('cafes.titlePrefix')} <span className="text-gradient-accent">{activeCity || t('cafes.yourCity')}</span>
        </h1>
        <p className="text-ink/60 mt-2">{t('cafes.subtitle')}</p>
      </header>

      <Card className="space-y-5 rounded-3xl">
        <div className="grid sm:grid-cols-3 gap-5">
          <div>
            <label className="block text-sm font-bold text-ink mb-2">{t('cafes.searchLabel')}</label>
            <SearchBar value={search} onChange={setSearch} placeholder={t('cafes.searchPlaceholder')} />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-2">{t('cafes.minRatingLabel')}</label>
            <select
              className="glass-input w-full rounded-full px-4 py-2.5 text-sm"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
            >
              <option value={0}>{t('cafes.allRatings')}</option>
              <option value={4}>{t('cafes.rating4Plus')}</option>
              <option value={4.5}>{t('cafes.rating45Plus')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-2">
              {t('cafes.maxDistanceLabel')} {maxDistance.toLocaleString('fa-IR')} {t('cafes.meters')}
            </label>
            <input
              type="range"
              min={200}
              max={MAX_DISTANCE_METERS}
              step={100}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full accent-primary-800 mt-3"
              disabled={!position}
            />
            {!position && <p className="text-xs text-ink/40 mt-1">{t('cafes.distanceLocationHint')}</p>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-bold text-ink mb-2">{t('cafes.neighborhoodLabel')}</label>
            <SearchBar value={neighborhoodQuery} onChange={setNeighborhoodQuery} placeholder={t('cafes.neighborhoodSearchPlaceholder')} className="mb-3" />
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {filteredNeighborhoods.map((n) => (
                <FilterChip key={n} active={activeNeighborhoods.includes(n)} onClick={() => toggleNeighborhood(n)}>
                  {n}
                </FilterChip>
              ))}
              {neighborhoods.length === 0 && <p className="text-xs text-ink/40">{t('cafes.noNeighborhoods')}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-2">{t('cafes.cafeTypeLabel')}</label>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={activeTag === 'all'} onClick={() => setActiveTag('all')}>
                {t('cafes.allTag')}
              </FilterChip>
              {tags.map((tag) => (
                <FilterChip key={tag} active={activeTag === tag} onClick={() => setActiveTag(tag)}>
                  {tag}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-4">
        <div className="flex justify-end">
          <div className="glass inline-flex rounded-full p-1 text-sm">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                viewMode === 'list' ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {t('cafes.viewList')}
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`px-4 py-1.5 rounded-full font-medium transition-all ${
                viewMode === 'map' ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button' : 'text-ink/60 hover:text-ink'
              }`}
            >
              {t('cafes.viewMap')}
            </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <DiscoveryMap venues={visibleVenues} onSelectVenue={(venue) => navigate(`/menu/${venue.id}`)} />
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {visibleVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onClick={() => navigate(`/menu/${venue.id}`)} />
            ))}
          </div>
        )}
        {visibleVenues.length === 0 && (
          <Card className="text-center py-10 rounded-3xl">
            <p className="text-ink/50">
              {cityVenues.length === 0
                ? `${t('cafes.noCafesInCityPrefix')} ${activeCity || t('cafes.thisCity')} ${t('cafes.noCafesInCitySuffix')}`
                : t('cafes.noCafesFiltered')}
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 ${
        active
          ? 'bg-gradient-to-b from-primary-700 to-primary-900 text-white shadow-button'
          : 'glass text-ink/70 hover:text-ink hover:border-accent-300'
      }`}
    >
      {children}
    </button>
  );
}
