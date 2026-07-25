import { useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n';
import { colors, fonts, radius } from '../theme';
import { Button, Card, Icon, Input, Row, T } from './UI';

function pad(n) {
  return String(n).padStart(2, '0');
}

export function ReservationSheet({ visible, onClose, venueId }) {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const [guestName, setGuestName] = useState(user?.name || '');
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');
  const [partySize, setPartySize] = useState('2');
  const [dateTime, setDateTime] = useState(new Date(Date.now() + 60 * 60 * 1000));
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(null); // 'date' | 'time' | null
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function reset() {
    setDone(false);
    setNotes('');
  }

  async function submit() {
    if (dateTime.getTime() <= Date.now()) {
      toast.error(t('reservationDateRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const reservationTime = `${dateTime.getFullYear()}-${pad(dateTime.getMonth() + 1)}-${pad(
        dateTime.getDate()
      )}T${pad(dateTime.getHours())}:${pad(dateTime.getMinutes())}:00`;
      await api.post(`/venues/${venueId}/reservations`, {
        guestName,
        guestPhone,
        partySize: Number(partySize) || 1,
        reservationTime,
        notes: notes || undefined,
      });
      setDone(true);
    } catch (err) {
      toast.error(err.response?.data?.message || t('orderFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <Card style={{ borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderBottomWidth: 0, padding: 20 }}>
          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <View style={{ marginBottom: 10 }}>
                <Icon name="check-circle" size={40} color={colors.green} />
              </View>
              <T style={{ fontFamily: fonts.black, fontSize: 16, textAlign: 'center' }}>{t('reservationDone')}</T>
              <T style={{ color: colors.inkMuted, fontSize: 13, textAlign: 'center', marginTop: 6 }}>
                {t('reservationDoneHint')}
              </T>
              <Button
                title={t('gotIt')}
                style={{ marginTop: 16, alignSelf: 'stretch' }}
                onPress={() => {
                  reset();
                  onClose();
                }}
              />
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Row between>
                <Row style={{ gap: 8 }}>
                  <Icon name="calendar" size={18} color={colors.gold300} />
                  <T style={{ fontFamily: fonts.black, fontSize: 19 }}>{t('reserveTableTitle')}</T>
                </Row>
                <Pressable onPress={onClose} hitSlop={10}>
                  <Icon name="x" size={20} color={colors.inkFaint} />
                </Pressable>
              </Row>

              <Input placeholder={t('guestNamePlaceholder')} value={guestName} onChangeText={setGuestName} />
              <Input
                placeholder={t('guestPhonePlaceholder')}
                value={guestPhone}
                onChangeText={(v) => setGuestPhone(v.replace(/\D/g, ''))}
                keyboardType="number-pad"
              />

              <Row style={{ gap: 10 }}>
                <Pressable style={{ flex: 1 }} onPress={() => setShowPicker('date')}>
                  <View pointerEvents="none">
                    <Input value={dateTime.toLocaleDateString()} editable={false} />
                  </View>
                </Pressable>
                <Pressable style={{ flex: 1 }} onPress={() => setShowPicker('time')}>
                  <View pointerEvents="none">
                    <Input
                      value={dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      editable={false}
                    />
                  </View>
                </Pressable>
              </Row>
              {showPicker && (
                <DateTimePicker
                  value={dateTime}
                  mode={showPicker}
                  is24Hour
                  minimumDate={showPicker === 'date' ? new Date() : undefined}
                  onChange={(event, selected) => {
                    setShowPicker(Platform.OS === 'ios' ? showPicker : null);
                    if (event.type === 'dismissed' || !selected) return;
                    setDateTime((prev) => {
                      const next = new Date(prev);
                      if (showPicker === 'date') {
                        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                      } else {
                        next.setHours(selected.getHours(), selected.getMinutes());
                      }
                      return next;
                    });
                  }}
                />
              )}

              <View>
                <T style={{ fontSize: 12, color: colors.inkMuted, marginBottom: 4 }}>{t('partySize')}</T>
                <Input
                  value={partySize}
                  onChangeText={(v) => setPartySize(v.replace(/\D/g, ''))}
                  keyboardType="number-pad"
                />
              </View>

              <Input
                placeholder={t('reservationNotesPlaceholder')}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />

              <Button
                title={submitting ? t('submittingReservation') : t('submitReservation')}
                onPress={submit}
                disabled={submitting}
                style={{ marginTop: 4 }}
              />
            </View>
          )}
        </Card>
      </View>
    </Modal>
  );
}
