import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Icon, Input, Loading, Muted, Row, T } from '../components/UI';
import { PressableScale } from '../components/motion';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';
import { useCustomerSocket } from '../hooks/useCustomerSocket';

const DEPARTMENTS = [
  { key: 'MANAGEMENT', labelKey: 'deptManagement', icon: 'briefcase' },
  { key: 'SALES', labelKey: 'deptSales', icon: 'percent' },
  { key: 'TECHNICAL', labelKey: 'deptTechnical', icon: 'tool' },
];

export default function SupportScreen() {
  const { orderId } = useLocalSearchParams();
  const router = useRouter();
  const { t, date } = useI18n();
  const toast = useToast();
  const { user } = useAuth();
  const [faq, setFaq] = useState([]);
  const [tickets, setTickets] = useState(null);
  const [creating, setCreating] = useState(!!orderId);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data || []);
    } catch {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    refresh();
    api.get('/content/faq').then(({ data }) => setFaq(data || [])).catch(() => {});
  }, [refresh]);

  useCustomerSocket(user?.id, { 'support:update': () => refresh() });

  if (tickets === null) return <Loading />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {creating ? (
        <NewTicketForm
          defaultOrderId={orderId || ''}
          onClose={() => setCreating(false)}
          onCreated={(ticket) => {
            setCreating(false);
            refresh();
            router.push(`/support-ticket/${ticket.id}`);
          }}
        />
      ) : (
        <Button icon="plus" title={t('newTicket')} onPress={() => setCreating(true)} style={{ marginBottom: 20 }} />
      )}

      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 12 }}>{t('myTickets')}</T>
      {tickets.length === 0 ? (
        <EmptyState icon="life-buoy" title={t('noTicketsYet')} subtitle={t('noTicketsYetHint')} />
      ) : (
        tickets.map((ticket) => (
          <PressableScale key={ticket.id} onPress={() => router.push(`/support-ticket/${ticket.id}`)}>
            <Card style={{ marginBottom: 10 }}>
              <Row between>
                <T style={{ fontFamily: fonts.bold, fontSize: 14, flex: 1 }} numberOfLines={1}>
                  {ticket.subject}
                </T>
                <Badge
                  icon={ticket.status === 'OPEN' ? 'clock' : 'check-circle'}
                  label={ticket.status === 'OPEN' ? t('ticketOpen') : t('ticketResolved')}
                  tone={ticket.status === 'OPEN' ? 'gold' : 'green'}
                />
              </Row>
              <Muted style={{ fontSize: 12, marginTop: 5 }}>
                {t(DEPARTMENTS.find((d) => d.key === ticket.department)?.labelKey)} · {date(ticket.createdAt)}
              </Muted>
            </Card>
          </PressableScale>
        ))
      )}

      {faq.length > 0 && (
        <>
          <T style={{ fontFamily: fonts.black, fontSize: 17, marginTop: 20, marginBottom: 12 }}>{t('faqTitle')}</T>
          {faq.map((item, i) => (
            <Card key={i} style={{ marginBottom: 10 }}>
              <T style={{ fontFamily: fonts.bold, fontSize: 14 }}>{item.question}</T>
              <Muted style={{ fontSize: 13, marginTop: 6, lineHeight: 20 }}>{item.answer}</Muted>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function NewTicketForm({ defaultOrderId, onClose, onCreated }) {
  const { t } = useI18n();
  const toast = useToast();
  const [department, setDepartment] = useState(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      selectionLimit: 3,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) setImages(result.assets.slice(0, 3));
  }

  async function submit() {
    if (!department || !subject || !message) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('department', department);
      formData.append('message', message);
      formData.append('isConfidential', String(confidential));
      images.forEach((img, i) => {
        formData.append('attachments', {
          uri: img.uri,
          name: img.fileName || `attachment-${i}.jpg`,
          type: img.mimeType || 'image/jpeg',
        });
      });
      const { data } = await api.post('/support/tickets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onCreated(data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card gold style={{ marginBottom: 20 }}>
      <T style={{ fontFamily: fonts.black, fontSize: 17, marginBottom: 14 }}>{t('newTicket')}</T>

      {!department ? (
        <View>
          <Muted style={{ marginBottom: 12 }}>{t('whichDepartment')}</Muted>
          <Row style={{ gap: 8 }}>
            {DEPARTMENTS.map((d) => (
              <Pressable
                key={d.key}
                onPress={() => setDepartment(d.key)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 16,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceHigh,
                }}
              >
                <Icon name={d.icon} size={20} color={colors.gold300} />
                <T style={{ fontSize: 12, fontFamily: fonts.medium }}>{t(d.labelKey)}</T>
              </Pressable>
            ))}
          </Row>
          <Button variant="ghost" title={t('cancel')} onPress={onClose} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <View>
          <Row style={{ gap: 6, marginBottom: 10 }}>
            <Muted style={{ fontSize: 12 }}>
              {t(DEPARTMENTS.find((d) => d.key === department)?.labelKey)}
            </Muted>
            <Pressable onPress={() => setDepartment(null)}>
              <T style={{ fontSize: 12, color: colors.gold300 }}>{t('changeDepartment')}</T>
            </Pressable>
          </Row>
          <Input
            placeholder={t('subjectPlaceholder')}
            value={subject}
            onChangeText={setSubject}
            style={{ marginBottom: 12 }}
          />
          <Input
            placeholder={t('messagePlaceholder')}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            style={{ marginBottom: 12 }}
          />
          {!!defaultOrderId && <Muted style={{ fontSize: 11, marginBottom: 10 }}>{defaultOrderId}</Muted>}

          <Pressable onPress={pickImage} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Icon name="paperclip" size={16} color={colors.gold300} />
            <T style={{ fontSize: 13 }}>{t('attachFiles')}</T>
          </Pressable>
          {images.length > 0 && <Muted style={{ fontSize: 11, marginBottom: 10 }}>{images.length} فایل انتخاب شد</Muted>}

          <Pressable
            onPress={() => setConfidential((v) => !v)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 }}
          >
            <Icon name={confidential ? 'check-square' : 'square'} size={16} color={confidential ? colors.gold300 : colors.inkFaint} />
            <T style={{ fontSize: 13, flex: 1 }}>{t('confidentialToggle')}</T>
          </Pressable>

          <Row style={{ gap: 8 }}>
            <Button
              title={submitting ? t('loading') : t('submitTicket')}
              onPress={submit}
              disabled={submitting || !subject || !message}
              style={{ flex: 1 }}
            />
            <Button variant="ghost" title={t('cancel')} onPress={onClose} />
          </Row>
        </View>
      )}
    </Card>
  );
}
