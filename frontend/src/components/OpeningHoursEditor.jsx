const DAYS = [
  { key: 'sat', label: 'شنبه' },
  { key: 'sun', label: 'یک‌شنبه' },
  { key: 'mon', label: 'دوشنبه' },
  { key: 'tue', label: 'سه‌شنبه' },
  { key: 'wed', label: 'چهارشنبه' },
  { key: 'thu', label: 'پنج‌شنبه' },
  { key: 'fri', label: 'جمعه' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = String(i).padStart(2, '0');
  return { value: `${h}:00`, label: `${i}:00` };
});

const DEFAULT_DAY = { open: true, from: '09:00', to: '22:00' };
const CLOSED_DAY = { open: false, from: '09:00', to: '22:00' };

/**
 * Parses whatever JSON shape is stored in the DB into a normalized per-day map.
 * Accepts both the old range format {"sat_wed":"9-22"} and the new per-day format.
 */
function parse(raw) {
  const base = {};
  DAYS.forEach((d) => { base[d.key] = { ...CLOSED_DAY }; });

  if (!raw) return base;

  let obj;
  try { obj = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return base; }

  // New per-day format: { sat: { open, from, to }, ... }
  if (obj.sat !== undefined || obj.sun !== undefined) {
    DAYS.forEach(({ key }) => {
      if (obj[key]) base[key] = { open: !!obj[key].open, from: obj[key].from || '09:00', to: obj[key].to || '22:00' };
    });
    return base;
  }

  // Legacy range format: { "sat_wed": "9-22", "fri": "closed" }
  Object.entries(obj).forEach(([rangeKey, val]) => {
    const dayKeys = rangeKey.split('_');
    dayKeys.forEach((dk) => {
      if (!base[dk]) return;
      if (val === 'closed' || val === false) {
        base[dk] = { open: false, from: '09:00', to: '22:00' };
      } else if (typeof val === 'string' && val.includes('-')) {
        const [f, t] = val.split('-');
        base[dk] = { open: true, from: `${f.padStart(2, '0')}:00`, to: `${t.padStart(2, '0')}:00` };
      }
    });
  });

  return base;
}

function serialize(schedule) {
  const out = {};
  DAYS.forEach(({ key }) => { out[key] = schedule[key]; });
  return JSON.stringify(out);
}

/**
 * OpeningHoursEditor
 *
 * Props:
 *   value      — JSON string (stored in venue.openingHours)
 *   onChange   — called with new JSON string whenever anything changes
 */
export default function OpeningHoursEditor({ value, onChange }) {
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

  const openDays = DAYS.filter((d) => schedule[d.key]?.open);

  return (
    <div className="space-y-1" dir="rtl">
      {DAYS.map(({ key, label }) => {
        const day = schedule[key] || CLOSED_DAY;
        return (
          <div key={key} className="flex items-center gap-3 py-1.5 border-b border-gray-100 last:border-0">
            {/* Day name + toggle */}
            <label className="flex items-center gap-2 w-28 cursor-pointer select-none flex-shrink-0">
              <input
                type="checkbox"
                checked={day.open}
                onChange={(e) => update(key, { open: e.target.checked })}
                className="w-4 h-4 rounded accent-primary-600 cursor-pointer"
              />
              <span className={`text-sm font-medium ${day.open ? 'text-gray-800' : 'text-gray-400'}`}>
                {label}
              </span>
            </label>

            {day.open ? (
              <>
                <span className="text-xs text-gray-400 flex-shrink-0">از</span>
                <select
                  value={day.from}
                  onChange={(e) => update(key, { from: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>

                <span className="text-xs text-gray-400 flex-shrink-0">تا</span>
                <select
                  value={day.to}
                  onChange={(e) => update(key, { to: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>{h.label}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => copyToAll(key)}
                  className="text-xs text-primary-600 hover:text-primary-800 whitespace-nowrap mr-auto"
                  title="اعمال این ساعت برای همه روزها"
                >
                  اعمال برای همه
                </button>
              </>
            ) : (
              <span className="text-xs text-gray-400 italic">تعطیل</span>
            )}
          </div>
        );
      })}

      {openDays.length === 0 && (
        <p className="text-xs text-amber-600 pt-1">هیچ روزی انتخاب نشده — مجموعه تعطیل نمایش داده می‌شود.</p>
      )}
    </div>
  );
}
