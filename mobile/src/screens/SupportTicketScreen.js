import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, KeyboardAvoidingView, Linking, Platform, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import api, { imageUrl } from '../api/client';
import { Badge, Button, Icon, Input, Loading, Muted, Row, T } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';

const DEPARTMENT_LABEL_KEY = { MANAGEMENT: 'deptManagement', SALES: 'deptSales', TECHNICAL: 'deptTechnical' };

export default function SupportTicketScreen() {
  const { ticketId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { t, date } = useI18n();
  const toast = useToast();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [confidential, setConfidential] = useState(false);
  const [images, setImages] = useState([]);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/support/tickets/${ticketId}`);
      setTicket(data);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      selectionLimit: 3,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) setImages(result.assets.slice(0, 3));
  }

  async function sendReply() {
    if (!reply.trim() && images.length === 0) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('body', reply);
      formData.append('isConfidential', String(confidential));
      images.forEach((img, i) => {
        formData.append('attachments', {
          uri: img.uri,
          name: img.fileName || `attachment-${i}.jpg`,
          type: img.mimeType || 'image/jpeg',
        });
      });
      await api.post(`/support/tickets/${ticketId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReply('');
      setImages([]);
      setConfidential(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSending(false);
    }
  }

  async function resolveTicket() {
    await api.patch(`/support/tickets/${ticketId}/status`, { status: 'RESOLVED' });
    await load();
  }

  if (!ticket) return <Loading />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: ticket.subject }} />

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Row between>
          <Badge label={t(DEPARTMENT_LABEL_KEY[ticket.department])} tone="gold" />
          <Row style={{ gap: 8 }}>
            <Badge
              icon={ticket.status === 'OPEN' ? 'clock' : 'check-circle'}
              label={ticket.status === 'OPEN' ? t('ticketOpen') : t('ticketResolved')}
              tone={ticket.status === 'OPEN' ? 'gold' : 'green'}
            />
            {ticket.status === 'OPEN' && (
              <Pressable onPress={resolveTicket}>
                <T style={{ fontSize: 12, color: colors.gold300, fontFamily: fonts.medium }}>{t('closeTicket')}</T>
              </Pressable>
            )}
          </Row>
        </Row>
      </View>

      <FlatList
        ref={listRef}
        data={ticket.messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item: m }) => {
          const mine = m.senderId === user?.id;
          return (
            <View
              style={{
                alignSelf: mine ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                backgroundColor: mine ? 'rgba(229,196,118,0.12)' : colors.surfaceHigh,
                borderRadius: radius.lg,
                padding: 12,
                marginBottom: 10,
              }}
            >
              <Row style={{ gap: 4, marginBottom: 4 }}>
                <Muted style={{ fontSize: 11 }}>
                  {m.senderName} — {date(m.createdAt)}
                </Muted>
                {!!m.isConfidential && <Icon name="lock" size={11} color={colors.gold300} />}
              </Row>
              {!!m.body && <T style={{ fontSize: 14 }}>{m.body}</T>}
              {m.attachments?.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {m.attachments.map((a) =>
                    (a.mimeType || '').startsWith('image/') ? (
                      <Pressable key={a.id} onPress={() => Linking.openURL(imageUrl(a.fileUrl))}>
                        <Image source={{ uri: imageUrl(a.fileUrl) }} style={{ width: 72, height: 72, borderRadius: radius.md }} />
                      </Pressable>
                    ) : (
                      <Pressable
                        key={a.id}
                        onPress={() => Linking.openURL(imageUrl(a.fileUrl))}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Icon name="paperclip" size={12} color={colors.gold300} />
                        <T style={{ fontSize: 12, color: colors.gold300 }}>{a.fileName}</T>
                      </Pressable>
                    )
                  )}
                </View>
              )}
            </View>
          );
        }}
      />

      {ticket.status === 'OPEN' && (
        <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
          {images.length > 0 && (
            <Row style={{ gap: 6, marginBottom: 8 }}>
              {images.map((img, i) => (
                <Image key={i} source={{ uri: img.uri }} style={{ width: 44, height: 44, borderRadius: radius.sm }} />
              ))}
            </Row>
          )}
          <Row style={{ gap: 8, alignItems: 'flex-end' }}>
            <Pressable onPress={pickImage} style={{ padding: 8 }}>
              <Icon name="paperclip" size={20} color={colors.gold300} />
            </Pressable>
            <Input
              placeholder={t('replyPlaceholder')}
              value={reply}
              onChangeText={setReply}
              multiline
              style={{ flex: 1, maxHeight: 90 }}
            />
            <Pressable onPress={() => setConfidential((v) => !v)} style={{ padding: 8 }}>
              <Icon name="lock" size={20} color={confidential ? colors.gold300 : colors.inkFaint} />
            </Pressable>
            <Button small title={sending ? t('sending') : t('send')} onPress={sendReply} disabled={sending} />
          </Row>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
