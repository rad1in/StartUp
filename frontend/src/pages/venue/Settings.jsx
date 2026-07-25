import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../context/LanguageContext';
import Card from '../../components/Card';
import Button from '../../components/Button';
import LocationPicker from '../../components/LocationPicker';
import OpeningHoursEditor from '../../components/OpeningHoursEditor';
import FileUpload from '../../components/FileUpload';
import Loader from '../../components/Loader';
import TemporaryClosureToggle from '../../components/TemporaryClosureToggle';
import PickupToggle from '../../components/PickupToggle';
import ApiKeysManager from '../../components/ApiKeysManager';
import WebhooksManager from '../../components/WebhooksManager';

const FILE_BASE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

function getTierLabels(t) {
  return {
    FREE: t('venue.settings.tierFree'),
    PRO: t('venue.settings.tierPro'),
    ULTRA: t('venue.settings.tierUltra'),
  };
}

function getNotificationCategories(t) {
  return [
    { key: 'NEW_ORDER', label: t('venue.settings.notifNewOrder') },
    { key: 'LOW_REVIEW', label: t('venue.settings.notifLowReview') },
  ];
}

export default function Settings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const venueId = user?.venueId;
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [requestedTier, setRequestedTier] = useState('PRO');
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [saved, setSaved] = useState(false);
  const [taxForm, setTaxForm] = useState({ economicCode: '', legalName: '', nationalId: '', postalCode: '' });
  const [taxSaved, setTaxSaved] = useState(false);
  const TIER_LABELS = getTierLabels(t);
  const NOTIFICATION_CATEGORIES = getNotificationCategories(t);

  async function refresh() {
    const [{ data: v }, { data: prefs }, { data: requests }] = await Promise.all([
      api.get(`/venues/${venueId}`),
      api.get('/notifications/preferences'),
      api.get(`/venues/${venueId}/subscription-requests`),
    ]);
    setVenue(v);
    setForm({
      name: v.name,
      description: v.description || '',
      address: v.address || '',
      cuisineType: v.cuisineType || '',
      neighborhood: v.neighborhood || '',
      tags: (v.tags || []).join('، '),
      lat: v.lat,
      lng: v.lng,
      openingHours: v.openingHours ? JSON.stringify(v.openingHours) : '',
    });
    setTaxForm({
      economicCode: v.economicCode || '',
      legalName: v.legalName || '',
      nationalId: v.nationalId || '',
      postalCode: v.postalCode || '',
    });
    setPreferences(prefs.filter((p) => NOTIFICATION_CATEGORIES.some((c) => c.key === p.category)));
    setSubscriptionRequests(requests);
  }

  useEffect(() => {
    if (venueId) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  async function saveProfile(e) {
    e.preventDefault();
    let openingHours = null;
    try {
      openingHours = form.openingHours ? JSON.parse(form.openingHours) : null;
    } catch {
      openingHours = null;
    }
    const tags = form.tags
      .split(/[،,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
    await api.patch(`/venues/${venueId}`, {
      ...form,
      tags,
      openingHours,
      lat: Number(form.lat),
      lng: Number(form.lng),
    });
    setSaved(true);
    refresh();
  }

  async function saveTaxInfo(e) {
    e.preventDefault();
    await api.patch(`/venues/${venueId}`, taxForm);
    setTaxSaved(true);
    refresh();
  }

  async function uploadLogo() {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append('image', logoFile);
    await api.post(`/venues/${venueId}/logo`, formData);
    setLogoFile(null);
    refresh();
  }

  async function uploadCover() {
    if (!coverFile) return;
    const formData = new FormData();
    formData.append('image', coverFile);
    await api.post(`/venues/${venueId}/cover`, formData);
    setCoverFile(null);
    refresh();
  }

  async function togglePreference(category, enabled) {
    await api.patch('/notifications/preferences', { category, enabled });
    setPreferences((prev) => prev.map((p) => (p.category === category ? { ...p, enabled } : p)));
  }

  async function requestUpgrade() {
    await api.post(`/venues/${venueId}/subscription-request`, { requestedTier });
    refresh();
  }

  if (!venueId || !venue || !form) return <Loader text={t('venue.settings.loadingSettings')} />;

  return (
    <div className="space-y-6 max-w-2xl">
      <TemporaryClosureToggle venue={venue} venueId={venueId} onChange={setVenue} />
      <PickupToggle venue={venue} venueId={venueId} onChange={setVenue} />

      <Card>
        <h3 className="font-bold text-ink mb-3">{t('venue.settings.logoAndCoverImage')}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {venue.logoUrl && (
                <img src={`${FILE_BASE_URL}${venue.logoUrl}`} alt={t('venue.settings.logo')} className="w-12 h-12 rounded-xl object-cover shadow-soft" />
              )}
              <p className="text-sm font-bold text-ink">{t('venue.settings.logo')}</p>
            </div>
            <FileUpload label={t('venue.settings.dropLogoHere')} file={logoFile} onSelect={setLogoFile} />
            <Button className="mt-2 w-full" onClick={uploadLogo} disabled={!logoFile}>
              {t('venue.settings.uploadLogo')}
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              {venue.coverImageUrl && (
                <img src={`${FILE_BASE_URL}${venue.coverImageUrl}`} alt={t('venue.settings.coverImage')} className="w-20 h-12 rounded-xl object-cover shadow-soft" />
              )}
              <p className="text-sm font-bold text-ink">{t('venue.settings.coverImage')}</p>
            </div>
            <FileUpload label={t('venue.settings.dropCoverHere')} file={coverFile} onSelect={setCoverFile} />
            <Button className="mt-2 w-full" onClick={uploadCover} disabled={!coverFile}>
              {t('venue.settings.uploadCover')}
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.settings.venueInfo')}</h3>
        <form onSubmit={saveProfile} className="space-y-3">
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.venueNamePlaceholder')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.descriptionPlaceholder')}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.addressPlaceholder')}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.venueTypePlaceholder')}
            value={form.cuisineType}
            onChange={(e) => setForm({ ...form, cuisineType: e.target.value })}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.neighborhoodPlaceholder')}
            value={form.neighborhood}
            onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
          />
          <div>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder={t('venue.settings.tagsPlaceholder')}
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <p className="text-xs text-ink/50 mt-1">{t('venue.settings.tagsHelperText')}</p>
          </div>
          <div className="border border-gray-200 rounded-xl px-3 py-2 bg-gray-50/50">
            <p className="text-sm text-gray-600 mb-2 font-medium">{t('venue.settings.openingHours')}</p>
            <OpeningHoursEditor
              value={form.openingHours}
              onChange={(val) => setForm({ ...form, openingHours: val })}
            />
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">{t('venue.settings.venueLocationOnMap')}</p>
            <LocationPicker
              lat={form.lat}
              lng={form.lng}
              onChange={({ lat, lng, address, neighborhood, city }) => {
                setForm((prev) => ({
                  ...prev,
                  lat,
                  lng,
                  ...(address && !prev.address ? { address } : {}),
                  ...(neighborhood && !prev.neighborhood ? { neighborhood } : {}),
                }));
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              {form.lat && form.lng
                ? `${t('venue.settings.coordinatesLabel')}: ${Number(form.lat).toFixed(6)}, ${Number(form.lng).toFixed(6)}`
                : t('venue.settings.noLocationSelectedYet')}
            </p>
          </div>

          {saved && <p className="flex items-center gap-1 text-ink font-medium text-sm"><CheckCircle size={14} />{t('venue.settings.changesSaved')}</p>}
          <Button type="submit">{t('venue.settings.saveChanges')}</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-1">{t('venue.settings.taxInfo')}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('venue.settings.taxInfoDesc')}
        </p>
        <form onSubmit={saveTaxInfo} className="grid sm:grid-cols-2 gap-2">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.economicCodePlaceholder')}
            value={taxForm.economicCode}
            onChange={(e) => setTaxForm({ ...taxForm, economicCode: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.legalNamePlaceholder')}
            value={taxForm.legalName}
            onChange={(e) => setTaxForm({ ...taxForm, legalName: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.nationalIdPlaceholder')}
            value={taxForm.nationalId}
            onChange={(e) => setTaxForm({ ...taxForm, nationalId: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2"
            placeholder={t('venue.settings.postalCodePlaceholder')}
            value={taxForm.postalCode}
            onChange={(e) => setTaxForm({ ...taxForm, postalCode: e.target.value })}
          />
          {taxSaved && <p className="sm:col-span-2 flex items-center gap-1 text-ink font-medium text-sm"><CheckCircle size={14} />{t('common.success')}.</p>}
          <Button type="submit" className="sm:col-span-2">{t('venue.settings.saveTaxInfo')}</Button>
        </form>
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.settings.subscriptionPlan')}</h3>
        <p className="text-sm text-gray-600 mb-3">
          {t('venue.settings.currentPlan')}: <span className="font-bold text-primary-700">{TIER_LABELS[venue.subscriptionTier]}</span>
        </p>
        <div className="flex gap-2 items-center">
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={requestedTier}
            onChange={(e) => setRequestedTier(e.target.value)}
          >
            {Object.entries(TIER_LABELS).map(([tier, label]) => (
              <option key={tier} value={tier}>
                {label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={requestUpgrade}>
            {t('venue.settings.requestPlanChange')}
          </Button>
        </div>
        {subscriptionRequests.length > 0 && (
          <div className="mt-3 space-y-1">
            {subscriptionRequests.map((req) => (
              <p key={req.id} className="text-xs text-gray-500">
                {t('venue.settings.planRequest')} {TIER_LABELS[req.requestedTier]} — {t('common.status')}: {req.status}
              </p>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold text-gray-800 mb-3">{t('venue.settings.notificationSettings')}</h3>
        <div className="space-y-2">
          {NOTIFICATION_CATEGORIES.map((category) => {
            const pref = preferences.find((p) => p.category === category.key);
            return (
              <label key={category.key} className="flex items-center justify-between text-sm">
                <span>{category.label}</span>
                <input
                  type="checkbox"
                  checked={pref?.enabled ?? true}
                  onChange={(e) => togglePreference(category.key, e.target.checked)}
                />
              </label>
            );
          })}
        </div>
      </Card>

      <ApiKeysManager venueId={venueId} />
      <WebhooksManager venueId={venueId} />
    </div>
  );
}
