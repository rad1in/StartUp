// Crowd-density indicator — a small colored dot the eye reads instantly:
// sage green = quiet, caramel = moderate, rosewood = busy.
const LEVELS = {
  quiet: { label: 'خلوت', dot: 'bg-green-500' },
  moderate: { label: 'متوسط', dot: 'bg-accent-500' },
  busy: { label: 'شلوغ', dot: 'bg-red-500', font: 'font-bold' },
};

export default function OccupancyBadge({ occupancy, className = '' }) {
  if (!occupancy || occupancy.level === 'unknown') return null;
  const config = LEVELS[occupancy.level];
  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-ink/70 ${config.font || ''} ${className}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
