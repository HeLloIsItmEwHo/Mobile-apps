// Creates the QuotePilot Pro product and its two prices in your Stripe
// account. Safe to run again — existing prices are left alone.
//
//   STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
//
// Alternative with nothing to install: set STRIPE_AUTO_SETUP=1 on the server
// and it does the same thing each time it starts.

import Stripe from 'stripe';
import { ensureStripePrices } from '../src/stripeSetup.js';

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Set STRIPE_SECRET_KEY first (Stripe dashboard → Developers → API keys).');
  process.exit(1);
}
const report = await ensureStripePrices(new Stripe(process.env.STRIPE_SECRET_KEY));
report.forEach((line) => console.log(line));
console.log('Done.');
