const { pool } = require('../../lib/db');

function assertVenueIds(venueIds) {
  if (!Array.isArray(venueIds) || venueIds.length === 0) {
    const err = new Error('حداقل یک مجموعه باید انتخاب شود.');
    err.status = 400;
    throw err;
  }
}

async function bulkSetVenueStatus(venueIds, { isTemporarilyClosed, acceptsPickup }) {
  assertVenueIds(venueIds);
  const sets = [];
  const params = [];
  if (isTemporarilyClosed !== undefined) {
    sets.push('isTemporarilyClosed = ?');
    params.push(!!isTemporarilyClosed);
  }
  if (acceptsPickup !== undefined) {
    sets.push('acceptsPickup = ?');
    params.push(!!acceptsPickup);
  }
  if (sets.length === 0) return { affected: 0 };
  const placeholders = venueIds.map(() => '?').join(', ');
  const [result] = await pool.query(
    `UPDATE \`Venue\` SET ${sets.join(', ')} WHERE id IN (${placeholders})`,
    [...params, ...venueIds]
  );
  return { affected: result.affectedRows };
}

// Plain string replace (not regex) — avoids ReDoS risk from admin-supplied patterns.
async function bulkFindReplaceDescription(venueIds, find, replace) {
  assertVenueIds(venueIds);
  if (!find) {
    const err = new Error('متن جستجو الزامی است.');
    err.status = 400;
    throw err;
  }
  const placeholders = venueIds.map(() => '?').join(', ');
  const [venues] = await pool.query(
    `SELECT id, description FROM \`Venue\` WHERE id IN (${placeholders}) AND description LIKE ?`,
    [...venueIds, `%${find}%`]
  );
  let affected = 0;
  for (const venue of venues) {
    const updated = venue.description.split(find).join(replace ?? '');
    if (updated !== venue.description) {
      await pool.query('UPDATE `Venue` SET description = ? WHERE id = ?', [updated, venue.id]);
      affected += 1;
    }
  }
  return { affected, matched: venues.length };
}

async function bulkAdjustMenuPrices(venueIds, percent) {
  assertVenueIds(venueIds);
  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct <= -100) {
    const err = new Error('درصد تغییر قیمت نامعتبر است.');
    err.status = 400;
    throw err;
  }
  const placeholders = venueIds.map(() => '?').join(', ');
  const [result] = await pool.query(
    `UPDATE \`MenuItem\` SET price = GREATEST(ROUND(price * (1 + ? / 100)), 0) WHERE venueId IN (${placeholders})`,
    [pct, ...venueIds]
  );
  return { affected: result.affectedRows };
}

async function bulkSetItemAvailability(venueIds, itemNameContains, isAvailable) {
  assertVenueIds(venueIds);
  if (!itemNameContains) {
    const err = new Error('نام آیتم برای جستجو الزامی است.');
    err.status = 400;
    throw err;
  }
  const placeholders = venueIds.map(() => '?').join(', ');
  const [result] = await pool.query(
    `UPDATE \`MenuItem\` SET isAvailable = ? WHERE venueId IN (${placeholders}) AND name LIKE ?`,
    [!!isAvailable, ...venueIds, `%${itemNameContains}%`]
  );
  return { affected: result.affectedRows };
}

module.exports = {
  bulkSetVenueStatus,
  bulkFindReplaceDescription,
  bulkAdjustMenuPrices,
  bulkSetItemAvailability,
};
