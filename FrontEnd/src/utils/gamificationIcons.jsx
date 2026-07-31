import { Medal, Trophy, Award, Star, Gem, Flag, Compass, Calendar, Target, Crown, Gift, BadgeCheck } from 'lucide-react';

export const GAMIFICATION_ICONS = {
  medal: Medal,
  trophy: Trophy,
  award: Award,
  star: Star,
  gem: Gem,
  flag: Flag,
  compass: Compass,
  calendar: Calendar,
  target: Target,
  crown: Crown,
  gift: Gift,
  'badge-check': BadgeCheck,
};

export const GAMIFICATION_ICON_NAMES = Object.keys(GAMIFICATION_ICONS);

export function GamificationIcon({ name, size = 18, className = '' }) {
  const Icon = GAMIFICATION_ICONS[name] || Award;
  return <Icon size={size} className={className} />;
}
