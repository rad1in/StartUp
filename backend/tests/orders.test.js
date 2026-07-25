const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/lib/db');

const VENUE_ID = 'demo-venue-0001';
const OWNER_EMAIL = 'owner@demo-cafe.local';
const CUSTOMER_EMAIL = 'customer@demo.local';
const SEEDED_PASSWORD = 'Password123!';

let ownerToken;
let customerToken;
let menuItem;
let table;
let createdOrderId;

test.before(async () => {
  const [items] = await pool.query('SELECT id, price FROM `MenuItem` WHERE venueId = ? LIMIT 1', [VENUE_ID]);
  menuItem = items[0];
  const [tables] = await pool.query('SELECT id FROM `VenueTable` WHERE venueId = ? LIMIT 1', [VENUE_ID]);
  table = tables[0];

  const ownerLogin = await request(app).post('/api/auth/login').send({ email: OWNER_EMAIL, password: SEEDED_PASSWORD });
  ownerToken = ownerLogin.body.accessToken;
  const customerLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: CUSTOMER_EMAIL, password: SEEDED_PASSWORD });
  customerToken = customerLogin.body.accessToken;
});

test.after(async () => {
  if (createdOrderId) {
    await pool.query('DELETE FROM `OrderItem` WHERE orderId = ?', [createdOrderId]);
    await pool.query('DELETE FROM `Order` WHERE id = ?', [createdOrderId]);
  }
  await pool.end();
});

test('creating an order requires a venue and at least one item', async () => {
  const res = await request(app).post('/api/orders').send({ venueId: VENUE_ID, items: [] });
  assert.equal(res.status, 400);
});

test('a logged-in customer can place an order and its total matches the menu price', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ venueId: VENUE_ID, tableId: table.id, items: [{ menuItemId: menuItem.id, quantity: 2 }] });

  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'PENDING');
  assert.equal(res.body.totalAmount, menuItem.price * 2);
  createdOrderId = res.body.id;
});

test('a guest (no token) can also place an order', async () => {
  const res = await request(app)
    .post('/api/orders')
    .send({ venueId: VENUE_ID, tableId: table.id, items: [{ menuItemId: menuItem.id, quantity: 1 }] });
  assert.equal(res.status, 201);
  assert.equal(res.body.customerId, null);
  await pool.query('DELETE FROM `OrderItem` WHERE orderId = ?', [res.body.id]);
  await pool.query('DELETE FROM `Order` WHERE id = ?', [res.body.id]);
});

test('an unknown menu item is rejected', async () => {
  const res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${customerToken}`)
    .send({ venueId: VENUE_ID, tableId: table.id, items: [{ menuItemId: 'not-a-real-id', quantity: 1 }] });
  assert.equal(res.status, 400);
});

test('reading an order requires authentication', async () => {
  const res = await request(app).get(`/api/orders/${createdOrderId}`);
  assert.equal(res.status, 401);
});

test('venue staff can view and update the status of an order in their own venue', async () => {
  const getRes = await request(app).get(`/api/orders/${createdOrderId}`).set('Authorization', `Bearer ${ownerToken}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.id, createdOrderId);

  const statusRes = await request(app)
    .patch(`/api/orders/${createdOrderId}/status`)
    .set('Authorization', `Bearer ${ownerToken}`)
    .send({ status: 'PREPARING' });
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.body.status, 'PREPARING');
});

test('the customer who owns the order can also read it back', async () => {
  const res = await request(app)
    .get(`/api/orders/${createdOrderId}`)
    .set('Authorization', `Bearer ${customerToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, createdOrderId);
});
