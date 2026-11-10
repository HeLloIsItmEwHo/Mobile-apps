import Stripe from 'stripe';

import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { createPool, migrate } from './db.js';
import { createMailer } from './mailer.js';

const config = loadConfig();
const pool = createPool(config.databaseUrl);
await migrate(pool);

const stripe = config.stripeSecretKey ? new Stripe(config.stripeSecretKey) : null;
if (!stripe) console.warn('[startup] STRIPE_SECRET_KEY is not set — billing endpoints will answer 503.');
if (stripe && !config.stripeWebhookSecret) console.warn('[startup] STRIPE_WEBHOOK_SECRET is not set — subscriptions will not activate.');
if (!config.resendApiKey) console.warn('[startup] RESEND_API_KEY is not set — password reset emails are printed here instead of sent.');

const app = createApp({ pool, config, stripe, mailer: createMailer(config) });
const server = app.listen(config.port, () => console.log(`QuotePilot API listening on :${config.port}`));

// Expired sessions and reset links are cleared out once a day.
const cleanup = setInterval(() => {
  pool.query(`DELETE FROM sessions WHERE expires_at < now(); DELETE FROM password_resets WHERE expires_at < now() - interval '7 days'`).catch((error) => console.error('[cleanup]', error));
}, 24 * 60 * 60 * 1000);
cleanup.unref();

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
