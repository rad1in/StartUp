import { Switch, View } from 'react-native';
import { Button, Icon, Input, Row, T } from './UI';
import { useI18n } from '../i18n';
import { colors, fonts } from '../theme';

const DAYS = [
  { key: 'sat', enKey: 'daySat' },
  { key: 'sun', enKey: 'daySun' },
  { key: 'mon', enKey: 'dayMon' },
  { key: 'tue', enKey: 'dayTue' },
  { key: 'wed', enKey: 'dayWed' },
  { key: 'thu', enKey: 'dayThu' },
  { key: 'fri', enKey: 'dayFri' },
];

const CLOSED_DAY = { open: false, from: '09:00', to: '22:00' };

// Mirrors the web OpeningHoursEditor's JSON shape exactly: { sat: {open, from, to}, ... }
// so the same venue.openingHours value round-trips between web and mobile.
function parse(raw) {
  const base = {};
  DAYS.forEach((d) => { base[d.key] = { ...CLOSED_DAY }; });
  if (!raw) return base;
  let obj;
  try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return base; }
  DAYS.forEach(({ key }) => {
    if (obj[key]) base[key] = { open: !!obj[key].open, from: obj[key].from || '09:00', to: obj[key].to || '22:00' };
  });
  return base;
}

function serialize(schedule) {
  const out = {};
  DAYS.forEach(({ key }) => { out[key] = schedule[key]; });
  return JSON.stringify(out);
}

export default function OpeningHoursEditor({ value, onChange }) {
  const { t } = useI18n();
  const schedule = parse(value);

  function update(dayKey, patch) {
    const next = { ...schedule, [dayKey]: { ...schedule[dayKey], ...patch } };
    onChange(serialize(next));
  }

  function copyToAll(dayKey) {
    const src = schedule[dayKey];
    const next = {};
    DAYS.forEach(({ key }) => { next[key] = { ...src }; });
    onChange(serialize(next));
  }

  return (
    <View style={{ gap: 10 }}>
      {DAYS.map(({ key, enKey }) => {
        const day = schedule[key] || CLOSED_DAY;
        return (
          <View key={key} style={{ borderBottomWidth: 1, borderBottomColor: colors.surfaceHigh, paddingBottom: 10 }}>
            <Row between>
              <Row style={{ gap: 8 }}>
                <Switch
                  value={day.open}
                  onValueChange={(v) => update(key, { open: v })}
                  trackColor={{ false: colors.surfaceHigh, true: colors.gold300 }}
                />
                <T style={{ fontFamily: fonts.medium, fontSize: 14, opacity: day.open ? 1 : 0.5 }}>{t(enKey)}</T>
              </Row>
              {day.open && (
                <Button small variant="ghost" icon="copy" title={t('applyToAllDays')} onPress={() => copyToAll(key)} />
              )}
            </Row>
            {day.open && (
              <Row style={{ gap: 8, marginTop: 8 }}>
                <Icon name="clock" size={14} color={colors.inkMuted} />
                <Input
                  style={{ flex: 1, paddingVertical: 8 }}
                  placeholder="09:00"
                  value={day.from}
                  onChangeText={(v) => update(key, { from: v })}
                />
                <T style={{ fontSize: 12, color: colors.inkMuted }}>—</T>
                <Input
                  style={{ flex: 1, paddingVertical: 8 }}
                  placeholder="22:00"
                  value={day.to}
                  onChangeText={(v) => update(key, { to: v })}
                />
              </Row>
            )}
          </View>
        );
      })}
    </View>
  );
}
