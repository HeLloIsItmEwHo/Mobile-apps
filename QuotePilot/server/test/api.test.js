import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import Stripe from 'stripe';

import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createPool, migrate } from '../src/db.js';

const WEBHOOK_SECRET = 'whsec_test_secret';
const config = loadConfig({
  DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgres://qp:qp@localhost:5432/quotepilot_test',
  PUBLIC_URL: 'https://api.test',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  AUTH_RATE_LIMIT: '1000',
});

// The real SDK signs and verifies webhooks offline; network calls are stubbed.
const stripe = new Stripe('sk_test_not_a_real_key');
const calls = [];
const subscriptions = new Map();
stripe.prices = { list: async (params) => (calls.push(['prices.list', params]), { data: [{ id: `price_${params.lookup_keys[0]}` }] }) };
stripe.customers = { create: async (params) => (calls.push(['customers.create', params]), { id: 'cus_test_1' }) };
stripe.checkout = { sessions: { create: async (params) => (calls.push(['checkout.create', params]), { url: 'https://checkout.stripe.test/session' }) } };
stripe.billingPortal = { sessions: { create: async (params) => (calls.push(['portal.create', params]), { url: 'https://billing.stripe.test/portal' }) } };
stripe.subscriptions = {
  retrieve: async (id) => subscriptions.get(id),
  cancel: async (id) => (calls.push(['subscriptions.cancel', id]), { id, status: 'canceled' }),
};

const sent = [];
const mailer = { send: async (message) => sent.push(message) };

let pool, server, base;

before(async () => {
  pool = createPool(config.databaseUrl);
  await migrate(pool);
  await migrate(pool); // must be safe to run on every start
  server = createApp({ pool, config, stripe, mailer }).listen(0);
  base = `http://localhost:${server.address().port}`;
});
beforeEach(async () => {
  await pool.query('TRUNCATE users, stripe_events CASCADE');
  calls.length = 0;
  sent.length = 0;
  subscriptions.clear();
});
after(async () => {
  server.close();
  await pool.end();
});

async function api(method, path, { token, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
const signup = async (email = 'sam@example.com', password = 'correct horse') => (await api('POST', '/auth/signup', { body: { email, password } })).body;

async function webhook(event, secret = WEBHOOK_SECRET) {
  const payload = JSON.stringify(event);
  const response = await fetch(base + '/billing/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': stripe.webhooks.generateTestHeaderString({ payload, secret }) },
    body: payload,
  });
  return response.status;
}
const subscription = (overrides = {}) => ({
  id: 'sub_1',
  customer: 'cus_test_1',
  status: 'trialing',
  cancel_at_period_end: false,
  metadata: {},
  items: { data: [{ current_period_end: 1900000000, price: { lookup_key: 'quotepilot_pro_monthly', recurring: { interval: 'month' } } }] },
  ...overrides,
});

test('sign up, sign in, and reject bad input', async () => {
  const created = await api('POST', '/auth/signup', { body: { email: ' Sam@Example.com ', password: 'correct horse' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.user.email, 'sam@example.com');
  assert.deepEqual({ pro: created.body.plan.pro, status: created.body.plan.status }, { pro: false, status: 'none' });

  assert.equal((await api('POST', '/auth/signup', { body: { email: 'sam@example.com', password: 'another one' } })).status, 409);
  assert.equal((await api('POST', '/auth/signup', { body: { email: 'not-an-email', password: 'correct horse' } })).status, 400);
  assert.equal((await api('POST', '/auth/signup', { body: { email: 'a@b.co', password: 'short' } })).status, 400);

  const login = await api('POST', '/auth/login', { body: { email: 'SAM@example.com', password: 'correct horse' } });
  assert.equal(login.status, 200);
  assert.equal((await api('GET', '/me', { token: login.body.token })).body.user.id, created.body.user.id);

  assert.equal((await api('POST', '/auth/login', { body: { email: 'sam@example.com', password: 'wrong' } })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { email: 'nobody@example.com', password: 'correct horse' } })).status, 401);
});

test('passwords and tokens are never stored in the clear', async () => {
  const { token } = await signup();
  const users = await pool.query('SELECT password_hash FROM users');
  assert.ok(users.rows[0].password_hash.startsWith('scrypt$'));
  assert.ok(!users.rows[0].password_hash.includes('correct horse'));
  const sessions = await pool.query('SELECT token_hash FROM sessions');
  assert.notEqual(sessions.rows[0].token_hash, token);
});

test('protected routes need a valid session; logout ends it', async () => {
  assert.equal((await api('GET', '/me')).status, 401);
  assert.equal((await api('GET', '/me', { token: 'made-up' })).status, 401);
  const { token } = await signup();
  assert.equal((await api('POST', '/auth/logout', { token })).status, 200);
  assert.equal((await api('GET', '/me', { token })).status, 401);
});

test('password reset: emailed link works once and signs out other devices', async () => {
  const { token: oldSession } = await signup();
  assert.equal((await api('POST', '/auth/forgot', { body: { email: 'nobody@example.com' } })).status, 200);
  assert.equal(sent.length, 0, 'no email for unknown addresses');

  await api('POST', '/auth/forgot', { body: { email: 'sam@example.com' } });
  assert.equal(sent.length, 1);
  const resetToken = sent[0].text.match(/reset-password\?token=([\w-]+)/)[1];
  assert.ok(sent[0].text.includes('https://api.test/reset-password'));

  const formPage = await fetch(`${base}/reset-password?token=${resetToken}`);
  assert.equal(formPage.status, 200);
  assert.equal((await fetch(`${base}/reset-password?token=%22%3E%3Cscript%3E`)).status, 400);

  assert.equal((await api('POST', '/auth/reset', { body: { token: resetToken, password: 'short' } })).status, 400);
  assert.equal((await api('POST', '/auth/reset', { body: { token: resetToken, password: 'brand new pass' } })).status, 200);
  assert.equal((await api('POST', '/auth/reset', { body: { token: resetToken, password: 'second attempt' } })).status, 400, 'single use');

  assert.equal((await api('GET', '/me', { token: oldSession })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { email: 'sam@example.com', password: 'correct horse' } })).status, 401);
  assert.equal((await api('POST', '/auth/login', { body: { email: 'sam@example.com', password: 'brand new pass' } })).status, 200);
});

test('sync: a second device receives what the first one saved', async () => {
  const { token } = await signup();
  const t = '2026-11-10T10:00:00.000Z';
  const first = await api('POST', '/sync', {
    token,
    body: { since: 0, changes: [
      { kind: 'profile', id: 'main', updatedAt: t, data: { businessName: 'Rivera Plumbing' } },
      { kind: 'quote', id: 'q1', updatedAt: t, data: { number: 'Q-1001', createdAt: t } },
    ] },
  });
  assert.equal(first.status, 200);
  assert.deepEqual(first.body.changes, [], 'a device is not sent its own changes back');
  assert.equal(first.body.usage.count, 1);

  const second = await api('POST', '/sync', { token, body: { since: 0, changes: [] } });
  assert.equal(second.body.changes.length, 2);
  assert.equal(second.body.changes.find((c) => c.kind === 'profile').data.businessName, 'Rivera Plumbing');
  assert.equal(second.body.rev, first.body.rev);

  const idle = await api('POST', '/sync', { token, body: { since: second.body.rev, changes: [] } });
  assert.deepEqual(idle.body.changes, []);
});

test('sync: the newest edit wins and stale edits are discarded', async () => {
  const { token } = await signup();
  const push = (updatedAt, title, since = 0) =>
    api('POST', '/sync', { token, body: { since, changes: [{ kind: 'quote', id: 'q1', updatedAt, data: { title } }] } });

  const a = await push('2026-11-10T10:00:00.000Z', 'first');
  await push('2026-11-10T12:00:00.000Z', 'newest');
  // A device that was offline sends an older edit: it loses, and is told the winner.
  const stale = await push('2026-11-10T11:00:00.000Z', 'stale', a.body.rev);
  assert.equal(stale.body.changes.length, 1);
  assert.equal(stale.body.changes[0].data.title, 'newest');

  const all = await api('POST', '/sync', { token, body: { since: 0, changes: [] } });
  assert.equal(all.body.changes.length, 1);
  assert.equal(all.body.changes[0].data.title, 'newest');
});

test('sync: deletions travel as tombstones and still count toward usage', async () => {
  const { token } = await signup();
  await api('POST', '/sync', { token, body: { since: 0, changes: [{ kind: 'quote', id: 'q1', updatedAt: '2026-11-10T10:00:00Z', data: { title: 'x' } }] } });
  await api('POST', '/sync', { token, body: { since: 0, changes: [{ kind: 'quote', id: 'q1', updatedAt: '2026-11-10T11:00:00Z', deleted: true }] } });
  const other = await api('POST', '/sync', { token, body: { since: 0, changes: [] } });
  assert.deepEqual(other.body.changes.map((c) => [c.id, c.deleted]), [['q1', true]]);
  assert.equal(other.body.usage.count, 1);
});

test('sync: accounts cannot see each other’s data; malformed changes are refused', async () => {
  const sam = await signup('sam@example.com');
  const alex = await signup('alex@example.com');
  await api('POST', '/sync', { token: sam.token, body: { since: 0, changes: [{ kind: 'quote', id: 'q1', updatedAt: '2026-11-10T10:00:00Z', data: { secret: 1 } }] } });
  const seen = await api('POST', '/sync', { token: alex.token, body: { since: 0, changes: [] } });
  assert.deepEqual(seen.body.changes, []);
  assert.equal(seen.body.usage.count, 0);

  // Same document id on another account is a separate document.
  await api('POST', '/sync', { token: alex.token, body: { since: 0, changes: [{ kind: 'quote', id: 'q1', updatedAt: '2026-11-11T10:00:00Z', data: { mine: true } }] } });
  const samAgain = await api('POST', '/sync', { token: sam.token, body: { since: 0, changes: [] } });
  assert.deepEqual(samAgain.body.changes.map((c) => c.data), [{ secret: 1 }]);

  for (const bad of [{ kind: 'users', id: 'x', updatedAt: '2026-01-01', data: {} }, { kind: 'quote', id: 'x', updatedAt: 'nope', data: {} }, { kind: 'quote', id: 'x', updatedAt: '2026-01-01', data: [1] }]) {
    assert.equal((await api('POST', '/sync', { token: alex.token, body: { since: 0, changes: [bad] } })).status, 400);
  }
  assert.equal((await api('POST', '/sync', { body: { since: 0, changes: [] } })).status, 401);
});

test('billing: checkout creates a customer and offers the trial once', async () => {
  const { token, user } = await signup();
  assert.equal((await api('POST', '/billing/checkout', { token, body: { plan: 'weekly' } })).status, 400);
  assert.equal((await api('POST', '/billing/portal', { token })).status, 400, 'no customer yet');

  const checkout = await api('POST', '/billing/checkout', { token, body: { plan: 'annual' } });
  assert.deepEqual(checkout.body, { url: 'https://checkout.stripe.test/session' });
  const params = calls.find(([name]) => name === 'checkout.create')[1];
  assert.equal(params.mode, 'subscription');
  assert.equal(params.customer, 'cus_test_1');
  assert.equal(params.client_reference_id, user.id);
  assert.deepEqual(params.line_items, [{ price: 'price_quotepilot_pro_annual', quantity: 1 }]);
  assert.equal(params.subscription_data.trial_period_days, 7);
  assert.equal(params.success_url, 'https://api.test/billing/done?status=success');

  calls.length = 0;
  await pool.query('UPDATE users SET trial_used = true');
  await api('POST', '/billing/checkout', { token, body: { plan: 'monthly' } });
  assert.ok(!calls.some(([name]) => name === 'customers.create'), 'customer is reused');
  assert.equal(calls.find(([name]) => name === 'checkout.create')[1].subscription_data.trial_period_days, undefined);

  assert.equal((await api('POST', '/billing/portal', { token })).body.url, 'https://billing.stripe.test/portal');
});

test('billing: webhooks turn Pro on and off; forged ones are refused', async () => {
  const { token } = await signup();
  await api('POST', '/billing/checkout', { token, body: { plan: 'monthly' } });

  subscriptions.set('sub_1', subscription());
  assert.equal(await webhook({ id: 'evt_forged', type: 'customer.subscription.created', data: { object: { id: 'sub_1' } } }, 'whsec_wrong'), 400);
  assert.equal((await api('GET', '/me', { token })).body.plan.pro, false);

  assert.equal(await webhook({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { mode: 'subscription', subscription: 'sub_1' } } }), 200);
  let plan = (await api('GET', '/me', { token })).body.plan;
  assert.deepEqual({ pro: plan.pro, status: plan.status, plan: plan.plan, trialAvailable: plan.trialAvailable }, { pro: true, status: 'trialing', plan: 'monthly', trialAvailable: false });
  assert.equal(plan.periodEnd, new Date(1900000000 * 1000).toISOString());
  assert.equal((await api('POST', '/billing/checkout', { token, body: { plan: 'monthly' } })).status, 409, 'cannot subscribe twice');

  // An out-of-date event arrives late: state is read from Stripe, not the event body.
  subscriptions.set('sub_1', subscription({ status: 'active', cancel_at_period_end: true }));
  assert.equal(await webhook({ id: 'evt_2', type: 'customer.subscription.updated', data: { object: { id: 'sub_1', status: 'trialing' } } }), 200);
  plan = (await api('GET', '/me', { token })).body.plan;
  assert.deepEqual({ pro: plan.pro, status: plan.status, cancelAtPeriodEnd: plan.cancelAtPeriodEnd }, { pro: true, status: 'active', cancelAtPeriodEnd: true });

  subscriptions.set('sub_1', subscription({ status: 'canceled' }));
  assert.equal(await webhook({ id: 'evt_3', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } }), 200);
  assert.equal((await api('GET', '/me', { token })).body.plan.pro, false);

  // Resubscribing gives a new subscription; a late event about the old one must not undo it.
  subscriptions.set('sub_2', subscription({ id: 'sub_2', status: 'active' }));
  await webhook({ id: 'evt_4', type: 'customer.subscription.created', data: { object: { id: 'sub_2' } } });
  await webhook({ id: 'evt_5', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
  assert.equal((await api('GET', '/me', { token })).body.plan.pro, true);

  assert.equal(await webhook({ id: 'evt_6', type: 'invoice.paid', data: { object: {} } }), 200, 'unrelated events are acknowledged');
});

test('deleting an account needs the password, cancels billing and removes the data', async () => {
  const { token } = await signup();
  await api('POST', '/billing/checkout', { token, body: { plan: 'monthly' } });
  subscriptions.set('sub_1', subscription({ status: 'active' }));
  await webhook({ id: 'evt_1', type: 'customer.subscription.created', data: { object: { id: 'sub_1' } } });
  await api('POST', '/sync', { token, body: { since: 0, changes: [{ kind: 'quote', id: 'q1', updatedAt: '2026-11-10T10:00:00Z', data: {} }] } });

  assert.equal((await api('DELETE', '/me', { token, body: { password: 'wrong' } })).status, 403);
  assert.equal((await api('DELETE', '/me', { token, body: { password: 'correct horse' } })).status, 200);
  assert.deepEqual(calls.filter(([name]) => name === 'subscriptions.cancel'), [['subscriptions.cancel', 'sub_1']]);
  for (const table of ['users', 'sessions', 'docs']) {
    assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n, 0, table);
  }
});

test('health, CORS preflight and unknown routes', async () => {
  assert.deepEqual((await api('GET', '/health')).body, { ok: true, billing: true });
  const preflight = await fetch(base + '/sync', { method: 'OPTIONS', headers: { Origin: 'https://app.example', 'Access-Control-Request-Method': 'POST' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
  assert.equal((await api('GET', '/nope')).status, 404);
});
