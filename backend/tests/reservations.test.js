const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/lib/db');
const { getSetting, setSetting } = require('../src/lib/platformSettings');

const VENUE_ID = 'demo-venue-0001';
const OWNER_EMAIL = 'owner@demo-cafe.local';
const SEEDED_PASSWORD = 'Password123!';

let ownerToken;
let totalTables;
let captchaWasEnabled;
const createdReservationIds = [];
const createdWaitlistIds = [];

test.before(async () => {
  // Test files run concurrently, so don't rely on another file's captcha
  // toggle — force it off here too for the duration of this login/suite.
  captchaWasEnabled = await getSetting('captcha.enabled', false);
  if (captchaWasEnabled) await setSetting('captcha.enabled', false);

  const ownerLogin = await request(app).post('/api/auth/login').send({ email: OWNER_EMAIL, password: SEEDED_PASSWORD });
  ownerToken = ownerLogin.body.accessToken;
  assert.ok(ownerToken, `owner login failed in test.before: ${JSON.stringify(ownerLogin.body)}`);
  const [[row]] = await pool.query('SELECT COUNT(*) AS cnt FROM `VenueTable` WHERE venueId = ?', [VENUE_ID]);
  totalTables = row.cnt;
});

test.after(async () => {
  if (captchaWasEnabled) await setSetting('captcha.enabled', true);
  if (createdWaitlistIds.length) {
    await pool.query(
      `DELETE FROM \`ReservationWaitlist\` WHERE id IN (${createdWaitlistIds.map(() => '?').join(',')})`,
      createdWaitlistIds
    );
  }
  if (createdReservationIds.length) {
    await pool.query(
      `DELETE FROM \`Reservation\` WHERE id IN (${createdReservationIds.map(() => '?').join(',')})`,
      createdReservationIds
    );
  }
  await pool.end();
});

function futureTime(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

test('a guest can create a reservation request', async () => {
  const res = await request(app).post(`/api/venues/${VENUE_ID}/reservations`).send({
    guestName: 'Test Guest',
    guestPhone: '09121234567',
    partySize: 2,
    reservationTime: futureTime(5),
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'PENDING');
  createdReservationIds.push(res.body.id);
});

test('a reservation request rejects an invalid phone number', async () => {
  const res = await request(app).post(`/api/venues/${VENUE_ID}/reservations`).send({
    guestName: 'Test Guest',
    guestPhone: '12345',
    partySize: 2,
    reservationTime: futureTime(5),
  });
  assert.equal(res.status, 400);
});

test('once every table is booked for a time slot, new requests are told the venue is full', async () => {
  const slot = futureTime(20);
  // Fill every table for this slot with confirmed/pending reservations.
  for (let i = 0; i < totalTables; i += 1) {
    const res = await request(app).post(`/api/venues/${VENUE_ID}/reservations`).send({
      guestName: `Filler ${i}`,
      guestPhone: '09121234567',
      partySize: 2,
      reservationTime: slot,
    });
    assert.equal(res.status, 201);
    createdReservationIds.push(res.body.id);
  }

  const fullRes = await request(app).post(`/api/venues/${VENUE_ID}/reservations`).send({
    guestName: 'One Too Many',
    guestPhone: '09121234567',
    partySize: 2,
    reservationTime: slot,
  });
  assert.equal(fullRes.status, 409);
  assert.equal(fullRes.body.code, 'VENUE_FULL');
});

test('a guest can join the waitlist once the venue is full', async () => {
  const slot = futureTime(20);
  const res = await request(app).post(`/api/venues/${VENUE_ID}/reservations/waitlist`).send({
    guestName: 'Waitlisted Guest',
    guestPhone: '09121234567',
    partySize: 2,
    requestedTime: slot,
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'WAITING');
  createdWaitlistIds.push(res.body.id);
});

test('venue staff can list reservations and the waitlist for their venue', async () => {
  const reservationsRes = await request(app)
    .get(`/api/venues/${VENUE_ID}/reservations`)
    .set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(reservationsRes.status, 200);
  assert.ok(Array.isArray(reservationsRes.body));

  const waitlistRes = await request(app)
    .get(`/api/venues/${VENUE_ID}/reservations/waitlist`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .query({ status: 'WAITING' });
  assert.equal(waitlistRes.status, 200);
  assert.ok(waitlistRes.body.some((w) => w.id === createdWaitlistIds[0]));
});

test('reservations and waitlist entries are scoped to their own venue — cross-venue access is rejected', async () => {
  // demo-venue-0002 is a second branch under the SAME owner (multi-branch
  // demo data), so it wouldn't actually prove venue scoping — use a venue
  // with a genuinely different owner instead.
  const res = await request(app)
    .get(`/api/venues/showcase-venue-01/reservations`)
    .set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(res.status, 403);
});
