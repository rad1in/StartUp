import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Switch, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import api, { imageUrl } from '../api/client';
import { Button, Card, Icon, Input, Loading, Muted, Row, T, Title } from '../components/UI';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';
import {
  authenticateBiometric,
  getBiometricEnabled,
  isBiometricAvailable,
  setBiometricEnabled,
} from '../services/biometricAuth';

export default function ProfileScreen() {
  const { t } = useI18n();
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    username: '',
    bio: '',
    isProfilePublic: false,
    smsMarketingOptOut: false,
    emailMarketingOptOut: false,
  });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBiometricAvailable);
    getBiometricEnabled().then(setBiometricOn);
  }, []);

  async function toggleBiometric(next) {
    if (next) {
      const ok = await authenticateBiometric(t('biometricConfirmPrompt'));
      if (!ok) return;
    }
    await setBiometricEnabled(next);
    setBiometricOn(next);
    toast.success(next ? t('biometricEnabled') : t('biometricDisabled'));
  }

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/customers/profile');
      setProfile(data);
      setForm({
        name: data.name || '',
        phone: data.phone || '',
        username: data.username || '',
        bio: data.bio || '',
        isProfilePublic: !!data.isProfilePublic,
        smsMarketingOptOut: !!data.smsMarketingOptOut,
        emailMarketingOptOut: !!data.emailMarketingOptOut,
      });
    } catch {
      setProfile({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!profile) return <Loading />;

  async function saveProfile() {
    setBusy(true);
    try {
      await api.patch('/customers/profile', {
        name: form.name,
        phone: form.phone || null,
        username: form.username,
        bio: form.bio,
        isProfilePublic: form.isProfilePublic,
        smsMarketingOptOut: form.smsMarketingOptOut,
        emailMarketingOptOut: form.emailMarketingOptOut,
      });
      toast.success(t('profileSaved'));
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function pickAndUpload(field) {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: field === 'avatar' ? [1, 1] : [3, 1],
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const setUploading = field === 'avatar' ? setUploadingAvatar : setUploadingCover;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append(field === 'avatar' ? 'avatar' : 'cover', {
        uri: asset.uri,
        name: asset.fileName || `${field}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });
      await api.post(`/customers/${field === 'avatar' ? 'avatar' : 'cover'}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function changePassword() {
    if (!passwords.currentPassword || !passwords.newPassword) {
      return toast.error(t('fillBothPasswords'));
    }
    setBusy(true);
    try {
      await api.post('/auth/change-password', passwords);
      toast.success(t('passwordChanged'));
      setPasswords({ currentPassword: '', newPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Title style={{ marginBottom: 12 }}>{t('editProfile')}</Title>

      <Row style={{ gap: 8, marginBottom: 16, backgroundColor: colors.surfaceHigh, borderRadius: radius.lg, padding: 12 }}>
        <Icon name="star" size={14} color={colors.gold300} style={{ marginTop: 2 }} />
        <Muted style={{ fontSize: 12, flex: 1, lineHeight: 18 }}>{t('profileTeaser')}</Muted>
      </Row>

      <Card style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
        <View style={{ height: 110, backgroundColor: colors.surfaceHigh }}>
          {profile.coverImageUrl ? (
            <Image source={{ uri: imageUrl(profile.coverImageUrl) }} style={{ width: '100%', height: '100%' }} />
          ) : null}
          <View
            style={{
              position: 'absolute',
              bottom: -28,
              right: 16,
              width: 72,
              height: 72,
              borderRadius: radius.lg,
              borderWidth: 3,
              borderColor: colors.surface,
              backgroundColor: colors.surfaceHigh,
              overflow: 'hidden',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {profile.avatarUrl ? (
              <Image source={{ uri: imageUrl(profile.avatarUrl) }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Icon name="user" size={24} color={colors.gold300} />
            )}
          </View>
        </View>
        <Row style={{ gap: 8, padding: 12, paddingTop: 36 }}>
          <Button
            small
            variant="ghost"
            icon="image"
            title={uploadingAvatar ? t('loading') : t('changeAvatar')}
            onPress={() => pickAndUpload('avatar')}
            disabled={uploadingAvatar}
            style={{ flex: 1 }}
          />
          <Button
            small
            variant="ghost"
            icon="image"
            title={uploadingCover ? t('loading') : t('changeCover')}
            onPress={() => pickAndUpload('cover')}
            disabled={uploadingCover}
            style={{ flex: 1 }}
          />
        </Row>
      </Card>

      <Card style={{ gap: 12, marginBottom: 16 }}>
        <Muted style={{ fontSize: 13 }}>
          {t('email')}: {profile.email}
        </Muted>
        <Input placeholder={t('fullName')} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Input
          placeholder={t('username')}
          value={form.username}
          onChangeText={(v) => setForm((f) => ({ ...f, username: v.toLowerCase() }))}
          autoCapitalize="none"
        />
        <Input
          placeholder={t('bio')}
          value={form.bio}
          onChangeText={(v) => setForm((f) => ({ ...f, bio: v.slice(0, 280) }))}
          multiline
          numberOfLines={3}
        />
        <Input
          placeholder={t('phone')}
          value={form.phone}
          onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
          keyboardType="phone-pad"
        />
        <Row between>
          <T style={{ fontSize: 14 }}>{t('publicProfile')}</T>
          <Switch
            value={form.isProfilePublic}
            onValueChange={(v) => setForm((f) => ({ ...f, isProfilePublic: v }))}
            trackColor={{ true: colors.gold300, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Row>
        <Row between>
          <T style={{ fontSize: 14 }}>{t('smsMarketingOptIn')}</T>
          <Switch
            value={!form.smsMarketingOptOut}
            onValueChange={(v) => setForm((f) => ({ ...f, smsMarketingOptOut: !v }))}
            trackColor={{ true: colors.gold300, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Row>
        <Row between>
          <T style={{ fontSize: 14 }}>{t('emailMarketingOptIn')}</T>
          <Switch
            value={!form.emailMarketingOptOut}
            onValueChange={(v) => setForm((f) => ({ ...f, emailMarketingOptOut: !v }))}
            trackColor={{ true: colors.gold300, false: colors.border }}
            thumbColor={colors.surface}
          />
        </Row>
        <Button title={busy ? t('loading') : t('save')} onPress={saveProfile} disabled={busy} />
      </Card>

      {biometricAvailable && (
        <Card style={{ marginBottom: 16 }}>
          <Row between>
            <Row style={{ gap: 12, flex: 1 }}>
              <Icon name="lock" size={16} color={colors.gold300} />
              <T style={{ fontFamily: fonts.medium, fontSize: 15, flex: 1 }}>{t('biometricLogin')}</T>
            </Row>
            <Switch
              value={biometricOn}
              onValueChange={toggleBiometric}
              trackColor={{ true: colors.gold300, false: colors.border }}
              thumbColor={colors.surface}
            />
          </Row>
          <Muted style={{ fontSize: 12, marginTop: 8 }}>{t('biometricLoginHint')}</Muted>
        </Card>
      )}

      <Card style={{ gap: 12 }}>
        <T style={{ fontFamily: fonts.bold, fontSize: 16 }}>{t('changePassword')}</T>
        <Input
          placeholder={t('currentPassword')}
          value={passwords.currentPassword}
          onChangeText={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))}
          secureTextEntry
        />
        <Input
          placeholder={t('newPassword')}
          value={passwords.newPassword}
          onChangeText={(v) => setPasswords((p) => ({ ...p, newPassword: v }))}
          secureTextEntry
        />
        <Button title={t('changePassword')} variant="ghost" onPress={changePassword} disabled={busy} />
      </Card>
    </ScrollView>
  );
}
