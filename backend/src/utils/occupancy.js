// Crowd-density thresholds, centralized here so they can be tuned later
// without touching the query/emission logic that uses them.
const OCCUPANCY_THRESHOLDS = { moderate: 0.34, busy: 0.7 };

function levelForRatio(activeTables, totalTables) {
  if (!totalTables) return 'unknown';
  const ratio = activeTables / totalTables;
  if (ratio >= OCCUPANCY_THRESHOLDS.busy) return 'busy';
  if (ratio >= OCCUPANCY_THRESHOLDS.moderate) return 'moderate';
  return 'quiet';
}

module.exports = { OCCUPANCY_THRESHOLDS, levelForRatio };
