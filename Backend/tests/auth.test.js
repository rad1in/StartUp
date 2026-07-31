const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/lib/db');
const { getSetting, setSetting } = require('../src/lib/platformSettings');

const TEST_EMAIL = `test-auth-${Date.now()}@et-cafe.test`;
const TEST_PASSWORD = 'Password123!';

// These are plain auth-flow tests, not captcha tests — force captcha off for
// the duration regardless of whatever an admin has toggled it to, so this
// suite's pass/fail never depends on ambient platform config.
let captchaWasEnabled;
test.before(async () => {
  captchaWasEnabled = await getSetting('captcha.enabled', false);
  if (captchaWasEnabled) await setSetting('captcha.enabled', false);
});

test.after(async () => {
  if (captchaWasEnabled) await setSetting('captcha.enabled', true);
  await pool.query('DELETE FROM `User` WHERE email = ?', [TEST_EMAIL]);
  await pool.end();
});

test('register creates a new customer account', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User' });
  assert.equal(res.status, 201);
  assert.ok(res.body.accessToken);
  assert.equal(res.body.user.email, TEST_EMAIL);
  assert.equal(res.body.user.role, 'CUSTOMER');
  assert.equal(res.body.user.passwordHash, undefined, 'password hash must never be sent to the client');
});

test('register rejects a duplicate email', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD, name: 'Test User Again' });
  assert.equal(res.status, 409);
});

test('login succeeds with correct credentials and sets a refresh cookie', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.ok(res.headers['set-cookie']?.some((c) => c.startsWith('refreshToken=')));
});

test('login rejects a wrong password', async () => {
  const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'WrongPassword!' });
  assert.equal(res.status, 401);
});

test('GET /me requires a valid access token', async () => {
  const unauthed = await request(app).get('/api/auth/me');
  assert.equal(unauthed.status, 401);

  const login = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.email, TEST_EMAIL);
});

test('account locks out after repeated failed logins', async () => {
  for (let i = 0; i < 4; i += 1) {
    const res = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'WrongPassword!' });
    assert.equal(res.status, 401);
  }
  // 5th consecutive failure trips the lockout.
  const lockedRes = await request(app).post('/api/auth/login').send({ email: TEST_EMAIL, password: 'WrongPassword!' });
  assert.equal(lockedRes.status, 429);

  // Even the correct password is rejected while locked.
  const correctButLocked = await request(app)
    .post('/api/auth/login')
    .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
  assert.equal(correctButLocked.status, 429);

  // Clear the lock directly so this test doesn't leak state into later runs.
  await pool.query('UPDATE `User` SET failedLoginAttempts = 0, lockedUntil = NULL WHERE email = ?', [TEST_EMAIL]);
});
