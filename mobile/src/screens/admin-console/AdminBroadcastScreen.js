import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Button, Card, Chip, Input, Row, T } from '../../components/UI';
import api from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { useI18n } from '../../i18n';
import { colors, fonts } from '../../theme';

const AUDIENCES = [
  { key: 'ALL', labelKey: 'audienceAll' },
  { key: 'CUSTOMERS', labelKey: 'audienceCustomers' },
  { key: 'VENUE_OWNERS', labelKey: 'audienceVenueOwners' },
];

export default function AdminBroadcastScreen() {
  const { t, n } = useI18n();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('ALL');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title || !body) return;
    setSending(true);
    try {
      const { data } = await api.post('/admin/broadcast', { title, body, audience });
      toast.success(t('broadcastSent', { n: n(data.sent || 0) }));
      setTitle('');
      setBody('');
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSending(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      <Card>
        <Input
          placeholder={t('broadcastTitlePlaceholder')}
          value={title}
          onChangeText={setTitle}
          style={{ marginBottom: 10 }}
        />
        <Input
          placeholder={t('broadcastBodyPlaceholder')}
          value={body}
          onChangeText={setBody}
          multiline
          numberOfLines={4}
          style={{ marginBottom: 14 }}
        />
        <T style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.inkMuted, marginBottom: 8 }}>{t('audience')}</T>
        <Row style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {AUDIENCES.map((a) => (
            <Chip key={a.key} label={t(a.labelKey)} active={audience === a.key} onPress={() => setAudience(a.key)} />
          ))}
        </Row>
        <Button title={sending ? t('loading') : t('sendBroadcast')} onPress={send} disabled={sending || !title || !body} />
      </Card>
    </ScrollView>
  );
}
