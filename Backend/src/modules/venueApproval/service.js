const { randomUUID } = require('crypto');
const { pool } = require('../../lib/db');
const { createNotification } = require('../notifications/service');

// Fixed 4-step onboarding pipeline. Order matters — stages must be completed
// in sequence, and the venue only goes ACTIVE once the last stage completes.
const STAGES = [
  { key: 'DOCUMENTS', order: 1, label: 'بررسی مدارک ثبت‌نام' },
  { key: 'LOCATION_VERIFICATION', order: 2, label: 'تایید موقعیت و آدرس' },
  { key: 'MENU_REVIEW', order: 3, label: 'بررسی منوی اولیه' },
  { key: 'FINAL_APPROVAL', order: 4, label: 'تایید نهایی و فعال‌سازی' },
];

async function ensureStages(venueId) {
  const [existing] = await pool.query('SELECT stageKey FROM `VenueApprovalStage` WHERE venueId = ?', [venueId]);
  const existingKeys = new Set(existing.map((r) => r.stageKey));
  const missing = STAGES.filter((s) => !existingKeys.has(s.key));
  for (const stage of missing) {
    await pool.query(
      'INSERT INTO `VenueApprovalStage` (id, venueId, stageKey, stageOrder, status) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), venueId, stage.key, stage.order, 'PENDING']
    );
  }
}

async function getStages(venueId) {
  await ensureStages(venueId);
  const [rows] = await pool.query('SELECT * FROM `VenueApprovalStage` WHERE venueId = ? ORDER BY stageOrder ASC', [venueId]);
  return rows.map((r) => ({ ...r, label: STAGES.find((s) => s.key === r.stageKey)?.label || r.stageKey }));
}

async function advanceStage(venueId, stageKey, { status, note }, actingUserId) {
  const stageDef = STAGES.find((s) => s.key === stageKey);
  if (!stageDef) throw Object.assign(new Error('مرحله نامعتبر است.'), { status: 400 });
  if (!['COMPLETED', 'REJECTED'].includes(status)) {
    throw Object.assign(new Error('وضعیت نامعتبر است.'), { status: 400 });
  }

  await ensureStages(venueId);

  // Enforce sequential order: a stage can't be completed before the ones
  // before it (the pipeline is meant to be worked through in order).
  if (status === 'COMPLETED' && stageDef.order > 1) {
    const [prevRows] = await pool.query(
      'SELECT status FROM `VenueApprovalStage` WHERE venueId = ? AND stageOrder < ? ORDER BY stageOrder DESC LIMIT 1',
      [venueId, stageDef.order]
    );
    if (prevRows[0]?.status !== 'COMPLETED') {
      throw Object.assign(new Error('ابتدا باید مرحله قبلی تکمیل شود.'), { status: 400 });
    }
  }

  await pool.query(
    'UPDATE `VenueApprovalStage` SET status = ?, note = ?, completedBy = ?, completedAt = NOW() WHERE venueId = ? AND stageKey = ?',
    [status, note || null, actingUserId, venueId, stageKey]
  );

  const [[venue]] = await pool.query('SELECT ownerId, name FROM `Venue` WHERE id = ?', [venueId]);

  if (status === 'REJECTED') {
    await pool.query('UPDATE `Venue` SET status = ?, statusReason = ? WHERE id = ?', ['REJECTED', note || null, venueId]);
    if (venue?.ownerId) {
      await createNotification(
        venue.ownerId,
        'SYSTEM',
        'ثبت‌نام مجموعه شما رد شد',
        `مرحله «${stageDef.label}» رد شد${note ? `: ${note}` : '.'}`,
        { venueId }
      );
    }
  } else if (stageDef.order === STAGES.length) {
    // Last stage completed — activate the venue.
    await pool.query('UPDATE `Venue` SET status = ?, statusReason = NULL WHERE id = ?', ['ACTIVE', venueId]);
    if (venue?.ownerId) {
      await createNotification(venue.ownerId, 'SYSTEM', 'مجموعه شما تایید شد!', 'ثبت‌نام شما تکمیل شد و مجموعه اکنون فعال است.', {
        venueId,
      });
    }
  } else if (venue?.ownerId) {
    await createNotification(
      venue.ownerId,
      'SYSTEM',
      'یک مرحله از تایید ثبت‌نام تکمیل شد',
      `مرحله «${stageDef.label}» تایید شد. مرحله بعدی در حال بررسی است.`,
      { venueId }
    );
  }

  return getStages(venueId);
}

module.exports = { STAGES, getStages, advanceStage };
