import express from 'express';
import { rateLimit } from 'express-rate-limit';

import { PRICE_LOOKUP_KEYS, applySubscription, planOf } from './billing.js';
import { withTransaction } from './db.js';
import { hashPassword, hashToken, newToken, verifyPassword } from './security.js';

const SESSION_DAYS = 180;
const RESET_MINUTES = 60;
const DOC_KINDS = new Set(['profile', 'quote']);
const MAX_CHANGES = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,100}$/;

// An error whose message is safe to show to the person using the app.
class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const page = (title, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title} · QuotePilot</title>
<style>body{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#F4F6F8;color:#0F1B2D;margin:0;padding:24px}
.card{max-width:420px;margin:8vh auto;background:#fff;border:1px solid #E3E8EE;border-radius:16px;padding:28px}
h1{font-size:22px;margin:0 0 8px}p{color:#5B6878;line-height:1.5}
input{width:100%;box-sizing:border-box;font-size:16px;padding:12px;border:1px solid #E3E8EE;border-radius:12px;margin:8px 0}
button,a.button{display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;font-size:16px;font-weight:700;color:#fff;background:#12355B;border:0;border-radius:12px;padding:14px;margin-top:8px;cursor:pointer}
.error{color:#D64545}</style></head><body><div class="card">${body}</div></body></html>`;

export function createApp({ pool, config, stripe = null, mailer }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    // The API authenticates with a bearer token, never cookies, so allowing
    // any origin does not let another site act as a signed-in user.
    const origin = req.headers.origin;
    const allowAny = config.corsOrigins.includes('*');
    if (origin && (allowAny || config.corsOrigins.includes(origin))) {
      res.set('Access-Control-Allow-Origin', allowAny ? '*' : origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.set('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // ---- Stripe webhook: needs the raw body, so it is mounted before JSON parsing.
  app.post('/billing/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
    if (!stripe || !config.stripeWebhookSecret) throw new HttpError(503, 'Billing is not configured.');
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], config.stripeWebhookSecret);
    } catch (error) {
      throw new HttpError(400, 'Invalid webhook signature.');
    }

    let subscriptionId = null;
    if (event.type === 'checkout.session.completed' && event.data.object.mode === 'subscription') {
      subscriptionId = event.data.object.subscription;
    } else if (event.type.startsWith('customer.subscription.')) {
      subscriptionId = event.data.object.id;
    }

    if (subscriptionId) {
      // Events can arrive out of order, so the event only tells us *which*
      // subscription changed; its current state is read fresh from Stripe.
      const id = typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id;
      const subscription = await stripe.subscriptions.retrieve(id);
      await applySubscription(pool, subscription);
    }
    // Recorded after the work succeeds: a failure above returns 500 and
    // Stripe retries, and applying the same subscription twice is harmless.
    await pool.query('INSERT INTO stripe_events (id) VALUES ($1) ON CONFLICT DO NOTHING', [event.id]);
    res.json({ received: true });
  });

  app.use(express.json({ limit: '6mb' })); // a profile can carry a logo image

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
  });

  // ---- helpers
  const readCredentials = (body) => {
    const email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!EMAIL_PATTERN.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address.');
    return { email, password };
  };
  const requireStrongPassword = (password) => {
    if (password.length < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
    if (password.length > 200) throw new HttpError(400, 'That password is too long.');
  };

  async function startSession(db, userId) {
    const token = newToken();
    await db.query(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 day')`, [
      hashToken(token),
      userId,
      SESSION_DAYS,
    ]);
    return token;
  }

  async function usageOf(db, userId) {
    // Counted by when the server first saw each quote (a device cannot backdate
    // it), and deleted quotes still count, so deleting does not hand one back.
    const { rows } = await db.query(
      `SELECT count(*)::int AS count, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM') AS month
         FROM docs WHERE user_id = $1 AND kind = 'quote' AND created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`,
      [userId]
    );
    return rows[0];
  }

  const account = async (db, user) => ({
    user: { id: user.id, email: user.email },
    plan: planOf(user),
    usage: await usageOf(db, user.id),
  });

  const requireAuth = async (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new HttpError(401, 'Please sign in.', 'unauthenticated');
    const { rows } = await pool.query(
      `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)]
    );
    if (!rows[0]) throw new HttpError(401, 'Your session has expired. Please sign in again.', 'unauthenticated');
    req.user = rows[0];
    req.tokenHash = hashToken(token);
    next();
  };

  const requireStripe = () => {
    if (!stripe) throw new HttpError(503, 'Billing is not set up yet. Please try again later.', 'billing_unavailable');
  };

  // ---- health
  app.get('/health', async (req, res) => {
    await pool.query('SELECT 1');
    res.json({ ok: true, billing: Boolean(stripe) });
  });

  // ---- accounts
  app.post('/auth/signup', authLimiter, async (req, res) => {
    const { email, password } = readCredentials(req.body);
    requireStrongPassword(password);
    const passwordHash = await hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) ON CONFLICT (email) DO NOTHING RETURNING *',
      [email, passwordHash]
    );
    if (!rows[0]) throw new HttpError(409, 'An account with this email already exists. Try signing in instead.', 'email_taken');
    res.status(201).json({ token: await startSession(pool, rows[0].id), ...(await account(pool, rows[0])) });
  });

  app.post('/auth/login', authLimiter, async (req, res) => {
    const { email, password } = readCredentials(req.body);
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    // Verify against a dummy hash when the email is unknown so the response
    // time does not reveal which emails have accounts.
    const ok = await verifyPassword(password, rows[0]?.password_hash || DUMMY_HASH);
    if (!rows[0] || !ok) throw new HttpError(401, 'That email or password is incorrect.', 'bad_credentials');
    res.json({ token: await startSession(pool, rows[0].id), ...(await account(pool, rows[0])) });
  });

  app.post('/auth/logout', requireAuth, async (req, res) => {
    await pool.query('DELETE FROM sessions WHERE token_hash = $1', [req.tokenHash]);
    res.json({ ok: true });
  });

  app.post('/auth/forgot', authLimiter, async (req, res) => {
    const { email } = readCredentials(req.body);
    const { rows } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (rows[0]) {
      const token = newToken();
      await pool.query(`INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES ($1, $2, now() + $3 * interval '1 minute')`, [
        hashToken(token),
        rows[0].id,
        RESET_MINUTES,
      ]);
      await mailer.send({
        to: email,
        subject: 'Reset your QuotePilot password',
        text: `Someone asked to reset the password for your QuotePilot account.\n\nChoose a new password here (the link works for ${RESET_MINUTES} minutes):\n${config.publicUrl}/reset-password?token=${token}\n\nIf this wasn't you, you can ignore this email.`,
      });
    }
    // Same answer either way, so this cannot be used to discover who has an account.
    res.json({ ok: true });
  });

  app.post('/auth/reset', authLimiter, async (req, res) => {
    const token = String(req.body?.token || '');
    const password = String(req.body?.password || '');
    requireStrongPassword(password);
    const passwordHash = await hashPassword(password);
    await withTransaction(pool, async (db) => {
      const { rows } = await db.query(
        'UPDATE password_resets SET used_at = now() WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() RETURNING user_id',
        [hashToken(token)]
      );
      if (!rows[0]) throw new HttpError(400, 'This reset link has expired or was already used. Request a new one from the app.', 'bad_token');
      await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
      // Sign out everywhere: whoever knew the old password loses access.
      await db.query('DELETE FROM sessions WHERE user_id = $1', [rows[0].user_id]);
    });
    res.json({ ok: true });
  });

  app.get('/reset-password', (req, res) => {
    const token = String(req.query.token || '');
    if (!TOKEN_PATTERN.test(token)) {
      return res.status(400).type('html').send(page('Reset password', '<h1>This link isn’t valid</h1><p>Request a new password reset from the QuotePilot app.</p>'));
    }
    res.type('html').send(
      page(
        'Reset password',
        `<h1>Choose a new password</h1><p>At least 8 characters.</p>
<form id="f"><input id="p" type="password" autocomplete="new-password" minlength="8" placeholder="New password" required/>
<button type="submit">Save password</button><p id="m" class="error"></p></form>
<script>
document.getElementById('f').addEventListener('submit', async function (e) {
  e.preventDefault();
  var m = document.getElementById('m');
  m.textContent = '';
  try {
    var r = await fetch('/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: ${JSON.stringify(token)}, password: document.getElementById('p').value }) });
    var j = await r.json();
    if (!r.ok) { m.textContent = j.error || 'Something went wrong.'; return; }
    document.querySelector('.card').innerHTML = '<h1>Password updated</h1><p>Go back to QuotePilot and sign in with your new password.</p>';
  } catch (err) { m.textContent = 'Could not reach the server. Try again.'; }
});
</script>`
      )
    );
  });

  app.get('/me', requireAuth, async (req, res) => {
    res.json(await account(pool, req.user));
  });

  app.delete('/me', requireAuth, async (req, res) => {
    if (!(await verifyPassword(String(req.body?.password || ''), req.user.password_hash))) {
      throw new HttpError(403, 'That password is incorrect.', 'bad_credentials');
    }
    // Stop billing first. If Stripe can't be reached the account is kept, so
    // nobody is left paying for an account they can no longer sign in to.
    const status = req.user.sub_status;
    if (req.user.stripe_subscription_id && status && status !== 'canceled' && status !== 'incomplete_expired') {
      requireStripe();
      await stripe.subscriptions.cancel(req.user.stripe_subscription_id);
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.user.id]); // cascades to sessions and docs
    res.json({ ok: true });
  });

  // ---- sync
  //
  // The device sends what it changed plus the last `rev` it has seen, and
  // gets back everything that changed elsewhere since then. Conflicts are
  // settled per document: the most recently edited copy wins.
  app.post('/sync', requireAuth, async (req, res) => {
    const since = Number(req.body?.since) || 0;
    const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];
    if (changes.length > MAX_CHANGES) throw new HttpError(400, `Send at most ${MAX_CHANGES} changes at a time.`);

    const clean = changes.map((change) => {
      const updatedAt = new Date(change?.updatedAt);
      const id = String(change?.id || '');
      if (!DOC_KINDS.has(change?.kind) || !id || id.length > 100 || Number.isNaN(updatedAt.getTime())) {
        throw new HttpError(400, 'A change was malformed.');
      }
      const deleted = Boolean(change.deleted);
      const data = deleted ? {} : change.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'A change was malformed.');
      return { kind: change.kind, id, data, deleted, updatedAt };
    });

    const result = await withTransaction(pool, async (db) => {
      // One sync at a time per user, so revs are handed out in commit order
      // and no device can skip past a change that commits a moment later.
      await db.query('SELECT 1 FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);

      const accepted = [];
      for (const change of clean) {
        const { rows } = await db.query(
          `INSERT INTO docs (user_id, kind, id, data, deleted, updated_at, created_at, rev)
           VALUES ($1, $2, $3, $4, $5, $6, now(), nextval('docs_rev'))
           ON CONFLICT (user_id, kind, id) DO UPDATE
             SET data = EXCLUDED.data, deleted = EXCLUDED.deleted, updated_at = EXCLUDED.updated_at, rev = EXCLUDED.rev
           WHERE docs.updated_at <= EXCLUDED.updated_at
           RETURNING rev`,
          [req.user.id, change.kind, change.id, JSON.stringify(change.data), change.deleted, change.updatedAt]
        );
        if (rows[0]) accepted.push(rows[0].rev);
      }

      // Everything newer than the device has seen, minus what it just sent.
      const { rows } = await db.query(
        `SELECT kind, id, data, deleted, updated_at, rev FROM docs
          WHERE user_id = $1 AND rev > $2 AND NOT (rev = ANY($3::bigint[])) ORDER BY rev`,
        [req.user.id, since, accepted]
      );
      const latest = await db.query('SELECT COALESCE(max(rev), 0)::bigint AS rev FROM docs WHERE user_id = $1', [req.user.id]);
      return {
        rev: Number(latest.rows[0].rev),
        changes: rows.map((row) => ({ kind: row.kind, id: row.id, data: row.data, deleted: row.deleted, updatedAt: row.updated_at.toISOString() })),
        usage: await usageOf(db, req.user.id),
      };
    });

    res.json({ ...result, plan: planOf(req.user) });
  });

  // ---- billing
  app.post('/billing/checkout', requireAuth, async (req, res) => {
    requireStripe();
    const lookupKey = PRICE_LOOKUP_KEYS[req.body?.plan];
    if (!lookupKey) throw new HttpError(400, 'Choose the monthly or annual plan.');
    if (planOf(req.user).pro) throw new HttpError(409, 'You already have QuotePilot Pro.', 'already_pro');

    const prices = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) throw new HttpError(503, 'That plan is not available yet. Please try again later.', 'billing_unavailable');

    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, metadata: { userId: req.user.id } });
      customerId = customer.id;
      await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.user.id]);
    }

    const trial = !req.user.trial_used && config.trialDays > 0;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      client_reference_id: req.user.id,
      line_items: [{ price: price.id, quantity: 1 }],
      subscription_data: { metadata: { userId: req.user.id }, ...(trial ? { trial_period_days: config.trialDays } : {}) },
      allow_promotion_codes: true,
      success_url: `${config.publicUrl}/billing/done?status=success`,
      cancel_url: `${config.publicUrl}/billing/done?status=cancelled`,
    });
    res.json({ url: session.url });
  });

  // Stripe's hosted page for changing card, switching plan or cancelling.
  app.post('/billing/portal', requireAuth, async (req, res) => {
    requireStripe();
    if (!req.user.stripe_customer_id) throw new HttpError(400, 'There is no subscription on this account yet.');
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: `${config.publicUrl}/billing/done?status=portal`,
    });
    res.json({ url: session.url });
  });

  app.get('/billing/done', (req, res) => {
    const success = req.query.status === 'success';
    const heading = success ? 'You’re on QuotePilot Pro' : req.query.status === 'portal' ? 'All done' : 'Checkout cancelled';
    const text = success
      ? 'Thanks for subscribing. Go back to the QuotePilot app — Pro unlocks within a few seconds.'
      : req.query.status === 'portal'
        ? 'Your changes are saved. You can go back to the QuotePilot app.'
        : 'You haven’t been charged. You can go back to the QuotePilot app.';
    const link = config.appUrl ? `<a class="button" href="${config.appUrl}">Open QuotePilot</a>` : '';
    res.type('html').send(page(heading, `<h1>${heading}</h1><p>${text}</p>${link}`));
  });

  // ---- errors
  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, code: error.code });
    if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'That is too large to save. Try a smaller logo image.' });
    if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'The request was not valid JSON.' });
    console.error(`[error] ${req.method} ${req.path}`, error);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });

  return app;
}

// A real hash of a random value; see /auth/login.
const DUMMY_HASH = await hashPassword(newToken());
