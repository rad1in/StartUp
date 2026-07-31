import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Coffee, QrCode, ArrowLeft } from 'lucide-react';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useCity } from '../../context/CityContext';
import api from '../../services/api';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { NearbyCard, VenueCard } from '../../components/VenueCards';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useLanguage } from '../../context/LanguageContext';

export default function Home() {
  const { t, n } = useLanguage();
  usePageTitle(t('home.pageTitle'));
  const navigate = useNavigate();
  const { position, error: geoError, loading: geoLoading } = useGeolocation();
  const { city } = useCity();
  const [nearbyVenues, setNearbyVenues] = useState([]);
  const [allVenues, setAllVenues] = useState([]);
  const [suggestedVenues, setSuggestedVenues] = useState([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [radiusMeters, setRadiusMeters] = useState(100);

  useEffect(() => {
    api.get('/venues').then(({ data }) => setAllVenues(data));
    api.get('/content/settings/discovery').then(({ data }) => setRadiusMeters(data.radiusMeters));
  }, []);

  useEffect(() => {
    if (!position) return;
    setLoadingNearby(true);
    api
      .get('/venues/nearby', { params: { lat: position.lat, lng: position.lng, radius: radiusMeters } })
      .then(({ data }) => setNearbyVenues(data))
      .finally(() => setLoadingNearby(false));
  }, [position, radiusMeters]);

  // "Suggested for you" is pure enhancement — if it fails or comes back empty
  // the section just doesn't render; browsing never blocks on it.
  useEffect(() => {
    const params = position ? { lat: position.lat, lng: position.lng } : {};
    api
      .get('/venues/suggestions', { params })
      .then(({ data }) => setSuggestedVenues(data.slice(0, 4)))
      .catch(() => setSuggestedVenues([]));
  }, [position]);

  // Scope discovery sections to the city picked in the header.
  const cityVenues = useMemo(
    () => (city?.name ? allVenues.filter((v) => v.city === city.name) : allVenues),
    [allVenues, city]
  );

  const cityCount = useMemo(() => new Set(allVenues.map((v) => v.city).filter(Boolean)).size, [allVenues]);
  const neighborhoodCount = useMemo(
    () => new Set(cityVenues.map((v) => v.neighborhood).filter(Boolean)).size,
    [cityVenues]
  );
  const featured = useMemo(
    () => [...cityVenues].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0)).slice(0, 4),
    [cityVenues]
  );

  function scrollToNearby() {
    document.getElementById('nearby')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-14">
      {/* ---------- HERO ---------- */}
      <section className="relative text-center pt-10 pb-6">
        {/* Decoration: a large gold bloom behind the headline plus the floating
            glass orbs. The bloom is what gives the bolder hero its depth. */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-visible">
          {/* Width is capped below 100vw on purpose — this is centred with
              -translate-x-1/2 inside an overflow-visible parent, so anything
              wider than the viewport bleeds past both edges and gives the
              whole page a horizontal scrollbar on phones. */}
          <div className="animate-glow-pulse absolute left-1/2 -translate-x-1/2 top-4 w-[min(34rem,90vw)] h-[22rem] rounded-full bg-accent-500/20 blur-[90px]" />
          <div className="glass-clear animate-float-slow absolute -top-2 right-4 sm:right-16 w-16 h-16 rounded-full" />
          <div
            className="glass-clear animate-float-slow absolute top-16 left-4 sm:left-24 w-10 h-10 rounded-full"
            style={{ animationDelay: '1.5s' }}
          />
          <div
            className="glass-clear animate-float-slow absolute bottom-0 right-10 sm:right-40 w-8 h-8 rounded-full"
            style={{ animationDelay: '3s' }}
          />
        </div>

        <p className="chip-gold mb-6 animate-rise-in">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-600 animate-pulse-soft" />
          {t('home.badge')}
        </p>

        <h1 className="heading-display text-[2.75rem] sm:text-display-lg lg:text-display-xl text-ink max-w-4xl mx-auto animate-rise-in text-balance">
          {t('home.heroTitle')}
          <br className="hidden sm:block" /> <span className="text-gold-sheen">{t('home.heroAccent')}</span>
        </h1>
        <p
          className="text-ink/60 text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mt-7 animate-rise-in text-balance"
          style={{ animationDelay: '0.1s' }}
        >
          {t('home.heroSubtitle')}
        </p>

        {/* Round, translucent glass action buttons — the aurora shows through them. */}
        <div className="flex items-start justify-center gap-7 sm:gap-12 mt-11 animate-rise-in" style={{ animationDelay: '0.18s' }}>
          <RoundAction icon={<MapPin size={30} />} label={t('home.roundActionNearMe')} onClick={scrollToNearby} />
          <RoundAction icon={<Coffee size={30} />} label={t('home.roundActionAllCafes')} onClick={() => navigate('/cafes')} highlight />
          <RoundAction icon={<QrCode size={30} />} label={t('home.roundActionScanQr')} onClick={() => navigate('/scan')} />
        </div>

        {/* Stat bar — heavier surface and larger numerals than before so it
            reads as a real credential strip, not a caption. */}
        <div
          className="inline-flex items-center gap-6 sm:gap-10 glass-strong rounded-full px-8 py-4 mt-12 shadow-card animate-rise-in"
          style={{ animationDelay: '0.26s' }}
        >
          <Stat value={cityVenues.length} label={`${t('home.statCafesIn')} ${city?.name || t('home.yourCity')}`} />
          <span className="w-px h-8 bg-ink/10" />
          <Stat value={neighborhoodCount} label={t('home.statNeighborhoods')} />
          <span className="w-px h-8 bg-ink/10" />
          <Stat value={cityCount || 1} label={t('home.statCities')} />
        </div>
      </section>

      {/* ---------- NEARBY ---------- */}
      <section id="nearby" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="section-tick" />
            <div>
              <h2 className="heading-display text-3xl sm:text-display-sm text-ink">{t('home.nearbyTitle')}</h2>
              <p className="text-sm text-ink/50 mt-1.5">{t('home.nearbyRadiusPrefix')} {n(radiusMeters)} {t('home.meters')}</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => navigate('/scan')} className="shrink-0">
            {t('home.scanQrButton')}
          </Button>
        </div>

        <Card className="rounded-3xl">
          {(geoLoading || (!geoError && loadingNearby)) && (
            <div className="flex flex-wrap gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 flex-1 min-w-[230px] p-3">
                  <div className="skeleton w-16 h-16 rounded-2xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-3/4" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {geoError && (
            <div className="text-center py-8">
              <MapPin size={32} className="mx-auto text-ink/20 mb-3" />
              <p className="text-ink/50 text-sm">
                {t('home.geoErrorMessage')}
              </p>
            </div>
          )}
          {!geoLoading && !geoError && !loadingNearby && nearbyVenues.length === 0 && (
            <div className="text-center py-8">
              <Coffee size={32} className="mx-auto text-ink/20 mb-3" />
              <p className="text-ink/50 text-sm">{t('home.noNearbyVenues')}</p>
            </div>
          )}
          {nearbyVenues.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {nearbyVenues.map((venue) => (
                <NearbyCard key={venue.id} venue={venue} onClick={() => navigate(`/menu/${venue.id}`)} />
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* ---------- SUGGESTED FOR YOU ---------- */}
      {suggestedVenues.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <span className="section-tick" />
            <div>
              <h2 className="heading-display text-3xl sm:text-display-sm text-ink">{t('home.suggestedTitle')}</h2>
              <p className="text-sm text-ink/50 mt-1">{t('home.suggestedSubtitle')}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {suggestedVenues.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onClick={() => navigate(`/menu/${venue.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- FEATURED ---------- */}
      {featured.length > 0 && (
        <section>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <span className="section-tick" />
              <div>
                <h2 className="heading-display text-3xl sm:text-display-sm text-ink">{t('home.featuredTitle')}</h2>
                <p className="text-sm text-ink/50 mt-1">{t('home.featuredSubtitle')}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/cafes')}
              className="group text-sm font-bold text-ink hover:text-accent-600 transition-colors shrink-0"
            >
              <span className="flex items-center gap-1">
                {t('home.allCafes')} <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
              </span>
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {featured.map((venue) => (
              <VenueCard key={venue.id} venue={venue} onClick={() => navigate(`/menu/${venue.id}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RoundAction({ icon, label, onClick, highlight = false }) {
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center gap-2.5">
      <span
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1 group-active:scale-95 ${
          highlight
            ? 'bg-gradient-to-br from-primary-700 to-primary-900 text-accent-300 ring-2 ring-accent-300/50 shadow-[0_12px_30px_rgba(20,18,16,0.3)] group-hover:shadow-gold-glow'
            : 'glass-clear text-ink shadow-[0_8px_24px_rgba(20,18,16,0.08)] group-hover:shadow-[0_14px_34px_rgba(20,18,16,0.14)] group-hover:text-accent-600'
        }`}
      >
        {icon}
      </span>
      <span className="text-xs sm:text-sm font-semibold text-ink/70 group-hover:text-ink transition-colors">
        {label}
      </span>
    </button>
  );
}

function Stat({ value, label }) {
  const { n } = useLanguage();
  return (
    <span className="flex flex-col items-center leading-tight gap-1">
      <span className="font-black text-gradient-accent text-2xl sm:text-3xl tabular-nums">{n(value)}</span>
      <span className="text-ink/50 text-[11px] font-semibold tracking-wide">{label}</span>
    </span>
  );
}
