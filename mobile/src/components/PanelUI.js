import { Pressable, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { Card, Icon, Muted, Row, T } from './UI';

// Compact KPI tile used across the venue/admin panel dashboards.
export function StatTile({ icon, label, value, tone = 'gold' }) {
  const toneColor = tone === 'green' ? colors.green : tone === 'red' ? colors.red : colors.gold300;
  const toneBg = tone === 'green' ? colors.greenBg : tone === 'red' ? colors.redBg : 'rgba(229,196,118,0.12)';
  return (
    <Card style={{ flex: 1, minWidth: 130, paddingVertical: 16 }}>
      <View style={[statIconStyle, { backgroundColor: toneBg }]}>
        <Icon name={icon} size={15} color={toneColor} />
      </View>
      <T style={{ fontFamily: fonts.black, fontSize: 22, marginTop: 12 }} numberOfLines={1}>
        {value}
      </T>
      <Muted style={{ fontSize: 12, marginTop: 3 }} numberOfLines={1}>
        {label}
      </Muted>
    </Card>
  );
}

// Navigation row inside a panel hub — icon + title + optional subtitle + chevron.
export function PanelNavRow({ icon, title, subtitle, badge, onPress, isRTL }) {
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: 10, paddingVertical: 15 }}>
        <Row between>
          <Row style={{ gap: 12, flex: 1 }}>
            <View style={rowIconStyle}>
              <Icon name={icon} size={16} color={colors.gold300} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: fonts.medium, fontSize: 15 }}>{title}</T>
              {subtitle ? (
                <Muted style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</Muted>
              ) : null}
            </View>
          </Row>
          <Row style={{ gap: 8 }}>
            {badge}
            <Icon name={chevron} size={16} color={colors.inkFaint} />
          </Row>
        </Row>
      </Card>
    </Pressable>
  );
}

const statIconStyle = {
  width: 32,
  height: 32,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
};

const rowIconStyle = {
  width: 38,
  height: 38,
  borderRadius: radius.md,
  backgroundColor: 'rgba(229,196,118,0.12)',
  alignItems: 'center',
  justifyContent: 'center',
};
