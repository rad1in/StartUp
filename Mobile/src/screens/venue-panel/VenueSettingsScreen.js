import { useCallback, useState } from 'react';
import { Image, ScrollView, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Chip, Icon, Input, Loading, Muted, Row, T } from '../../components/UI';
import OpeningHoursEditor from '../../components/OpeningHoursEditor';
import api, { imageUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const TIERS = ['FREE', 'PRO', 'ULTRA'];
const NOTIFICATION_CATEGORIES = ['NEW_ORDER', 'LOW_REVIEW'];

export default function VenueSettingsScreen() {
  const { user } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [venue, setVenue] = useState(null);
  const [form, setForm] = useState(null);
  const [preferences, setPreferences] = useState([]);
  const [subscriptionRequests, setSubscriptionRequests] = useState([]);
  const [requestedTier, setRequestedTier] = useState('PRO');
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ data: v }, { data: prefs }, { data: requests }] = await Promise.all([
        api.get(`/venues/${user.venueId}`),
        api.get('/notifications/preferences'),
        api.get(`/venues/${user.venueId}/subscription-requests`),
      ]);
      setVenue(v);
      setForm({
        name: v.name || '',
        description: v.description || '',
        address: v.address || '',
        cuisineType: v.cuisineType || '',
        neighborhood: v.neighborhood || '',
        tags: (v.tags || []).join('، '),
        openingHours: v.openingHours ? JSON.stringify(v.openingHours) : '',
      });
      setPreferences(prefs.filter((p) => NOTIFICATION_CATEGORIES.includes(p.category)));
      setSubscriptionRequests(requests);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }, [user.venueId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function save() {
    setSaving(true);
    try {
      let openingHours = null;
      try {
        openingHours = form.openingHours ? JSON.parse(form.openingHours) : null;
      } catch {
        openingHours = null;
      }
      const tags = form.tags.split(/[،,]/).map((s) => s.trim()).filter(Boolean);
      await api.patch(`/venues/${user.venueId}`, { ...form, tags, openingHours });
      toast.success(t('profileSaved'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function pickAndUpload(field) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: field === 'logo' ? [1, 1] : [16, 9],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const setUploading = field === 'logo' ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        name: asset.fileName || `${field}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await api.post(`/venues/${user.venueId}/${field}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function togglePreference(category, enabled) {
    try {
      await api.patch('/notifications/preferences', { category, enabled });
      setPreferences((prev) => prev.map((p) => (p.category === category ? { ...p, enabled } : p)));
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  async function requestUpgrade() {
    try {
      await api.post(`/venues/${user.venueId}/subscription-request`, { requestedTier });
      toast.success(t('planRequestSent'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }

  if (!venue || !form) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginBottom: 14 }}>{t('venueSettings')}</T>

      <Card style={{ marginBottom: 14 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('logoAndCover')}</T>
        <Row style={{ gap: 16 }}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.surfaceHigh,
                overflow: 'hidden',
                marginBottom: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {venue.logoUrl ? (
                <Image source={{ uri: imageUrl(venue.logoUrl) }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Icon name="image" size={22} color={colors.gold300} />
              )}
            </View>
            <Button
              small
              variant="ghost"
              title={uploadingLogo ? t('loading') : t('changeLogo')}
              onPress={() => pickAndUpload('logo')}
              disabled={uploadingLogo}
            />
          </View>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 96,
                height: 64,
                borderRadius: 16,
                backgroundColor: colors.surfaceHigh,
                overflow: 'hidden',
                marginBottom: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {venue.coverImageUrl ? (
                <Image source={{ uri: imageUrl(venue.coverImageUrl) }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Icon name="image" size={22} color={colors.gold300} />
              )}
            </View>
            <Button
              small
              variant="ghost"
              title={uploadingCover ? t('loading') : t('changeCover')}
              onPress={() => pickAndUpload('cover')}
              disabled={uploadingCover}
            />
          </View>
        </Row>
      </Card>

      <Card style={{ marginBottom: 14, gap: 10 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{t('venueInfo')}</T>
        <Input placeholder={t('venueName')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Input
          placeholder={t('venueDescription')}
          value={form.description}
          onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top', paddingTop: 14 }}
        />
        <Input placeholder={t('venueAddress')} value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} />
        <Input
          placeholder={t('cuisineType')}
          value={form.cuisineType}
          onChangeText={(v) => setForm((f) => ({ ...f, cuisineType: v }))}
        />
        <Input
          placeholder={t('neighborhood')}
          value={form.neighborhood}
          onChangeText={(v) => setForm((f) => ({ ...f, neighborhood: v }))}
        />
        <View>
          <Input placeholder={t('tagsPlaceholder')} value={form.tags} onChangeText={(v) => setForm((f) => ({ ...f, tags: v }))} />
          <Muted style={{ fontSize: 11, marginTop: 4 }}>{t('tagsHint')}</Muted>
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('openingHours')}</T>
        <OpeningHoursEditor value={form.openingHours} onChange={(val) => setForm((f) => ({ ...f, openingHours: val }))} />
      </Card>

      <Button title={saving ? t('loading') : t('saveChanges')} onPress={save} disabled={saving} style={{ marginBottom: 14 }} />

      <Card style={{ marginBottom: 14 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 4 }}>{t('subscriptionPlan')}</T>
        <Muted style={{ fontSize: 12, marginBottom: 10 }}>
          {t('currentPlan')}: {t(`tier${venue.subscriptionTier}`)}
        </Muted>
        <Row style={{ gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          {TIERS.map((tier) => (
            <Chip key={tier} label={t(`tier${tier}`)} active={requestedTier === tier} onPress={() => setRequestedTier(tier)} />
          ))}
        </Row>
        <Button variant="ghost" title={t('requestPlanChange')} onPress={requestUpgrade} />
        {subscriptionRequests.map((req) => (
          <Muted key={req.id} style={{ fontSize: 11, marginTop: 8 }}>
            {t(`tier${req.requestedTier}`)} — {req.status}
          </Muted>
        ))}
      </Card>

      <Card>
        <T style={{ fontFamily: fonts.bold, fontSize: 14, marginBottom: 10 }}>{t('notificationSettings')}</T>
        {NOTIFICATION_CATEGORIES.map((category) => {
          const pref = preferences.find((p) => p.category === category);
          return (
            <Row key={category} between style={{ paddingVertical: 6 }}>
              <T style={{ fontSize: 13 }}>{t(category === 'NEW_ORDER' ? 'newOrderNotif' : 'lowReviewNotif')}</T>
              <Switch
                value={pref?.enabled ?? true}
                onValueChange={(v) => togglePreference(category, v)}
                trackColor={{ false: colors.surfaceHigh, true: colors.gold300 }}
              />
            </Row>
          );
        })}
      </Card>
    </ScrollView>
  );
}
