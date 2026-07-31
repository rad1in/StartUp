import { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Badge, Button, Card, EmptyState, Icon, Input, Loading, Muted, Row, T } from '../components/UI';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

function TwoFactorCard() {
  const { user, refreshUser } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const enabled = !!user?.twoFactorEnabled;

  const [stage, setStage] = useState('idle'); // idle | setup | disable
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  async function startSetup() {
    setBusy(true);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSecret(data.secret);
      setStage('setup');
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnable() {
    setBusy(true);
    try {
      await api.post('/auth/2fa/enable', { code });
      await refreshUser();
      toast.success(t('twoFaEnabled'));
      setStage('idle');
      setCode('');
      setSecret('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('twoFaInvalidCode'));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDisable() {
    setBusy(true);
    try {
      await api.post('/auth/2fa/disable', { code });
      await refreshUser();
      toast.success(t('twoFaDisabled'));
      setStage('idle');
      setCode('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('twoFaInvalidCode'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card gold style={{ marginBottom: 16 }}>
      <Row style={{ gap: 10 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: enabled ? colors.greenBg : colors.surfaceHigh,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={enabled ? 'shield' : 'shield-off'} size={20} color={enabled ? colors.green : colors.gold300} />
        </View>
        <View style={{ flex: 1 }}>
          <Row style={{ gap: 6 }}>
            <T style={{ fontFamily: fonts.bold, fontSize: 15 }}>{t('twoFaTitle')}</T>
            {enabled && <Badge label={t('twoFaActive')} tone="green" />}
          </Row>
          <Muted style={{ fontSize: 11, marginTop: 4 }}>{t('twoFaHint')}</Muted>
        </View>
      </Row>

      {enabled && stage === 'idle' && (
        <Button
          variant="danger"
          small
          icon="shield-off"
          title={t('twoFaDisable')}
          onPress={() => setStage('disable')}
          style={{ marginTop: 14, alignSelf: 'flex-start' }}
        />
      )}

      {!enabled && stage === 'idle' && (
        <Button
          small
          icon="shield"
          title={busy ? t('loading') : t('twoFaEnable')}
          onPress={startSetup}
          disabled={busy}
          style={{ marginTop: 14, alignSelf: 'flex-start' }}
        />
      )}

      {stage === 'setup' && (
        <View style={{ marginTop: 14 }}>
          <Muted style={{ fontSize: 12, marginBottom: 8 }}>{t('twoFaStep1')}</Muted>
          <View
            style={{
              backgroundColor: colors.surfaceHigh,
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 10,
              marginBottom: 12,
            }}
          >
            <T selectable style={{ fontFamily: fonts.medium, fontSize: 14, letterSpacing: 1 }}>
              {secret}
            </T>
          </View>
          <Muted style={{ fontSize: 12, marginBottom: 8 }}>{t('twoFaStep2')}</Muted>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="------"
            keyboardType="number-pad"
            maxLength={6}
            style={{ marginBottom: 10, textAlign: 'center', letterSpacing: 6, fontSize: 18 }}
          />
          <Row style={{ gap: 8 }}>
            <Button
              small
              title={busy ? t('loading') : t('twoFaConfirmEnable')}
              onPress={confirmEnable}
              disabled={busy || code.length < 6}
              style={{ flex: 1 }}
            />
            <Button
              small
              variant="ghost"
              title={t('cancel')}
              onPress={() => {
                setStage('idle');
                setCode('');
                setSecret('');
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </View>
      )}

      {stage === 'disable' && (
        <View style={{ marginTop: 14 }}>
          <Muted style={{ fontSize: 12, marginBottom: 8 }}>{t('twoFaDisablePrompt')}</Muted>
          <Input
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="------"
            keyboardType="number-pad"
            maxLength={6}
            style={{ marginBottom: 10, textAlign: 'center', letterSpacing: 6, fontSize: 18 }}
          />
          <Row style={{ gap: 8 }}>
            <Button
              small
              variant="danger"
              title={busy ? t('loading') : t('twoFaConfirmDisable')}
              onPress={confirmDisable}
              disabled={busy || code.length < 6}
              style={{ flex: 1 }}
            />
            <Button
              small
              variant="ghost"
              title={t('cancel')}
              onPress={() => {
                setStage('idle');
                setCode('');
              }}
              style={{ flex: 1 }}
            />
          </Row>
        </View>
      )}
    </Card>
  );
}

export default function SessionsScreen() {
  const { t, date } = useI18n();
  const toast = useToast();
  const [sessions, setSessions] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/customers/sessions');
      setSessions(data || []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function confirmRevoke(session) {
    Alert.alert(t('revokeSessionTitle'), t('revokeSessionConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('revokeSession'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/customers/sessions/${session.id}`);
            load();
          } catch (err) {
            toast.error(err.response?.data?.message || t('orderFailed'));
          }
        },
      },
    ]);
  }

  if (sessions === null) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <TwoFactorCard />

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('activeSessions')}</T>
      {sessions.length === 0 ? (
        <EmptyState icon="smartphone" title={t('noSessions')} />
      ) : (
        sessions.map((session) => (
          <Card key={session.id} style={{ marginBottom: 10 }}>
            <Row between>
              <Row style={{ gap: 12, flex: 1 }}>
                <View style={styles.deviceIcon}>
                  <Icon name="smartphone" size={16} color={colors.gold300} />
                </View>
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 13 }} numberOfLines={2}>
                    {session.userAgent || t('unknownDevice')}
                  </T>
                  <Muted style={{ fontSize: 12, marginTop: 4 }}>
                    {t('lastUsed')}: {session.lastUsedAt ? date(session.lastUsedAt) : '—'}
                  </Muted>
                </View>
              </Row>
              <Button small variant="danger" title={t('revokeSession')} onPress={() => confirmRevoke(session)} />
            </Row>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = {
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(229,196,118,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
